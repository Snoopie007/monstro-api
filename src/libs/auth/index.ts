import { db } from '@/db/db';
import { accounts, sessions, userRoles, users } from '@subtrees/schemas';
import bcrypt from 'bcryptjs';
import { customSession, multiSession } from "better-auth/plugins";
import { APIError, betterAuth } from 'better-auth';
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { toNextJsHandler } from "better-auth/next-js";
import { SignJWT } from "jose";

const isProduction = process.env.NODE_ENV === "production";
const isPreview = process.env.VERCEL_ENV === "preview";

/**
 * Signs a JWT token using Supabase JWT secret for authenticated API access
 */
async function signSupabaseJWT(
	payload: {
		id: string;
		email: string;
		name: string;
		role: string;
		vendorId?: string;
		staffId?: string;
	},
	userId: string
): Promise<string> {
	const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;

	if (!supabaseJwtSecret) {
		throw new Error("SUPABASE_JWT_SECRET environment variable is required");
	}

	const secret = new TextEncoder().encode(supabaseJwtSecret);

	const jwtPayload = {
		sub: userId,
		email: payload.email,
		user_metadata: {
			name: payload.name,
			email: payload.email,
		},
		app_metadata: {
			provider: "credentials",
			providers: ["credentials"],
		},
		aud: "authenticated",
		role: "authenticated",
		vendorId: payload.vendorId,
		staffId: payload.staffId,
		userRole: payload.role,
	};

	const jwt = await new SignJWT(jwtPayload)
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setIssuedAt()
		.setExpirationTime("24h")
		.setIssuer(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`)
		.setAudience("authenticated")
		.sign(secret);

	return jwt;
}

export const auth = betterAuth({
	baseURL: process.env.NEXT_PUBLIC_APP_URL,
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			user: users,
			account: accounts,
			session: sessions,
		},
	}),
	plugins: [
		multiSession(),
		customSession(async ({ user, session }) => {
			// Fetch user with vendor OR staff data in a single optimized query
			const userData = await db.query.users.findFirst({
				where: (users, { eq }) => eq(users.id, user.id),
				with: {
					vendor: {
						columns: {
							id: true,
							phone: true,
							stripeCustomerId: true,
						},
						with: {
							locations: {
								columns: {
									id: true,
									name: true,
								},
								with: {
									locationState: {
										columns: {
											status: true,
										},
									},
								},
							},
						},
					},
					staff: {
						columns: {
							id: true,
							phone: true,
						},
						with: {
							staffLocations: {
								columns: {
									status: true,
								},
								with: {
									location: {
										columns: {
											id: true,
											name: true,
										},
									},
								},
							},
						},
					},
				},
			});


			if (!userData) {
				throw new APIError("BAD_REQUEST", {
					message: "User not found",
				});
			}

			let userPayload: {
				phone: string | null;
				image: string | null;
				vendorId?: string;
				staffId?: string;
				stripeCustomerId?: string | null;
				role: "vendor" | "staff";
				locations: any[];
			};

			if (userData.vendor) {
				// Vendor logic
				const filteredLocations = userData.vendor.locations
					.filter((location) => {
						const { locationState } = location;
						return locationState && ["active"].includes(locationState.status);
					})
					.map((location) => ({
						id: location.id,
						name: location.name,
						status: location.locationState?.status,
					}));

				userPayload = {
					phone: userData.vendor.phone,
					image: userData.image,
					vendorId: userData.vendor.id,
					stripeCustomerId: userData.vendor.stripeCustomerId,
					role: "vendor",
					locations: filteredLocations,
				};
			} else if (userData.staff) {
				// Staff logic
				const roleAssignments = await db.query.userRoles.findMany({
					where: (ur, { eq }) => eq(ur.userId, userData.id),
					with: {
						role: {
							with: {
								permissions: {
									with: {
										permission: true,
									},
								},
							},
						},
					},
				});

				const transformedLocations = userData.staff.staffLocations.map((staffLocation) => {
					const rolesForLocation = roleAssignments
						.map((assignment) => assignment.role)
						.filter((role): role is NonNullable<typeof role> => Boolean(role));

					const permissions = new Set<string>();
					rolesForLocation.forEach((role) => {
						role.permissions.forEach((rp) => {
							if (rp.permission) {
								permissions.add(rp.permission.name);
							}
						});
					});

					return {
						id: staffLocation.location.id,
						name: staffLocation.location.name,
						status: staffLocation.status,
						roles: rolesForLocation,
						permissions: Array.from(permissions),
					};
				});

			userPayload = {
				phone: userData.staff.phone,
				image: userData.image,
				staffId: String(userData.staff.id),
				role: "staff",
				locations: transformedLocations,
			};
			} else {
				throw new APIError("BAD_REQUEST", {
					message: "User not associated with vendor or staff",
				});
			}

			// Generate Supabase JWT
			const sbToken = await signSupabaseJWT(
				{
					id: user.id,
					email: user.email,
					name: user.name,
					role: userPayload.role,
					vendorId: userPayload.vendorId,
					staffId: userPayload.staffId,
				},
				user.id
			);

			return {
				session: {
					...session
				},
				user: {
					...user,
					...userPayload,
					sbToken,
				},
			}
		})
	],

	// Add this to tell Better Auth that "provider" field is actually "providerId"
	account: {
		fields: {
			providerId: "provider",  // Map providerId to your provider column
		},
	},
	emailAndPassword: {
		enabled: true,
		// Custom password verification
		password: {
			hash: async (password: string) => {
				return bcrypt.hash(password, 10);
			},

			verify: async ({ hash, password }: { hash: string; password: string }) => {
				return bcrypt.compare(password, hash);
			},
		}
	},

	session: {
		// Note: Field mappings are handled by the Drizzle schema
		expiresIn: 60 * 60 * 24 * 365, // 1 year
		updateAge: 60 * 60, // Update every hour
	},

	advanced: {
		useSecureCookies: isProduction,
		cookiePrefix: "monstro",

		crossSubDomainCookies: {
			enabled: true,
			domain: isProduction
				? ".monstro-x.com"
				: isPreview
					? ".monstrox.vercel.app"
					: undefined,
		},
	},

	trustedOrigins: [
		"https://monstro-x.com",
		"https://www.monstro-x.com",
		"https://app.monstro-x.com",
		"https://checkin.monstro-x.com",
		"https://c.monstro-x.com",
		isPreview && "https://monstrox.vercel.app",
	].filter(Boolean) as string[],

	hooks: {
		// BEFORE hooks - handle existing users without account records
		before: createAuthMiddleware(async (ctx) => {
			if (ctx.path === "/sign-in/email") {
				const { email, password } = ctx.body;

				const normalizedEmail = email?.trim().toLowerCase();

				// Check if user exists in users table
				const user = await db.query.users.findFirst({
					where: (user, { eq }) => eq(user.email, normalizedEmail),
					columns: {
						id: true,
						email: true,
						username: true,
						discriminator: true,
					},
					with: {
						accounts: {
							columns: {
								password: true,
							}
						}
					}
				});

				if (user && user.accounts?.[0]?.password) {
					// User exists with password, check if they have an account record
					const existingAccount = await db.query.accounts.findFirst({
						where: (account, { eq, and }) =>
							and(
								eq(account.userId, user.id),
								eq(account.provider, "credential")
							),
						columns: {
							provider: true,
							accountId: true,
							userId: true,
						},
					});


					if (!existingAccount) {
						// User exists but no account record - create one for backwards compatibility
						// This handles migrated users from Next-Auth
						const match = await bcrypt.compare(password, user.accounts?.[0]?.password);

						if (match) {
							// Create credential account record
							await db.insert(accounts).values({
								userId: user.id,
								type: "email" as any, // Type for email/password accounts
								provider: "credential",
								accountId: user.email, // Use user ID as account ID for credentials
								password: user.accounts?.[0]?.password
							});
						}
					}
				}
			}

			return ctx;
		}),
	},
});

export const { GET, POST } = toNextJsHandler(auth);
