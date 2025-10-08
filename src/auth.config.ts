import { CredentialsSignin, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { getRedisClient } from "./libs/server/redis";
import { isAfter } from "date-fns";
import { signSupabaseJWT } from "./libs/server/supabase-jwt";
import { db } from "./db/db";
class CustomLoginError extends CredentialsSignin {
	constructor(code: string) {
		super();
		this.code = code;
		this.message = code;
		this.stack = undefined;
	}
}

async function validateToken(t: string, uid: string, type: string) {
	const redis = getRedisClient();
	const RedisKey = `loginToken:${uid}:${type}`;
	const otp = await redis.get(RedisKey);
	const [token, time] = otp?.toString().split("::") || [];

	// Check if the token is expired (more than 30 minutes old)

	if (!otp || token !== t) {
		throw new CustomLoginError("Invalid token");
	}

	const thirtyMinutesInMs = 30 * 60 * 1000;
	const tokenExpired = isAfter(
		new Date(),
		new Date(parseInt(time) * 1000 + thirtyMinutesInMs)
	);

	await redis.del(RedisKey);
	if (tokenExpired) {
		throw new CustomLoginError("Token expired");
	}
}

export default {
	providers: [
		Credentials({
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
				token: { label: "Token", type: "text" },
				type: { label: "Type", type: "text" },
			},
			authorize: async (credentials) => {
				if (!credentials?.email || !credentials?.password) {
					return null;
				}

				try {
					const user = await db.query.users.findFirst({
						where: (user, { eq }) => eq(user.email, `${credentials.email}`),
						with: {
							vendor: {
								columns: {
									id: true,
									phone: true,
									avatar: true,
									stripeCustomerId: true,
								},
								with: {
									locations: {
										with: {
											locationState: {
												columns: {
													status: true,
												},
											},
										},
										columns: {
											id: true,
											name: true,
										},
									},
								},
							},
							staff: {
								columns: {
									id: true,
									phone: true,
									avatar: true,
								},
								with: {
									staffLocations: {
										with: {
											location: {
												columns: {
													id: true,
													name: true,
												},
											},
											roles: {
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
											},
										},
										columns: {
											status: true,
										},
									},
								},
							},
						},
					});

					if (!user || !user.password)
						throw new CustomLoginError("No user found");

					if (!user) throw new CustomLoginError("User not found");

					const match = await bcrypt.compare(
						credentials.password as string,
						user.password
					);
					if (!match) throw new CustomLoginError("Invalid password or email.");
					// if (credentials.token && credentials.type) {
					// 	await validateToken(
					// 		credentials.token.toString(),
					// 		user.id,
					// 		credentials.type.toString()
					// 	);
					// }

					// Determine user type and build appropriate payload
					let userPayload;

					if (user.vendor) {
						// User is a vendor
						const {
							vendor: { locations, ...vendor },
							...rest
						} = user;

						const transformedLocations = locations.map((location: any) => {
							const { locationState, ...restData } = location;
							return {
								...restData,
								status: locationState ? locationState.status : "incomplete",
							};
						});

						userPayload = {
							id: rest.id,
							name: rest.name,
							email: rest.email,
							phone: vendor.phone,
							image: vendor?.avatar,
							vendorId: vendor?.id,
							stripeCustomerId: vendor?.stripeCustomerId,
							role: "vendor",
							locations: transformedLocations,
						};
					} else if (user.staff) {
						// User is a staff member
						const {
							staff: { staffLocations, ...staff },
							...rest
						} = user;

						const transformedLocations = staffLocations.map((staffLocation: any) => {
							// Extract all permissions from all roles for this location
							const permissions = new Set<string>();
							staffLocation.roles.forEach((roleAssignment: any) => {
								roleAssignment.role.permissions.forEach((rp: any) => {
									permissions.add(rp.permission.name);
								});
							});

							return {
								id: staffLocation.location.id,
								name: staffLocation.location.name,
								status: staffLocation.status,
								roles: staffLocation.roles.map((r: any) => r.role),
								permissions: Array.from(permissions),
							};
						});

						userPayload = {
							id: rest.id,
							name: rest.name,
							email: rest.email,
							phone: staff.phone,
							image: staff?.avatar,
							staffId: staff?.id,
							role: "staff",
							locations: transformedLocations,
						};
					} else {
						throw new CustomLoginError("User is not associated with a vendor or staff account");
					}
					// Create Supabase JWT token
					const sbToken = await signSupabaseJWT(
						userPayload,
						userPayload.id
					);


					return {
						...userPayload,
						sbToken: sbToken,
					};
				} catch (error) {
					console.log(error);
					if (error instanceof CustomLoginError) {
						throw error;
					}
					throw new CustomLoginError("Invalid password or email.");
				}
			},
		}),
	],
} satisfies NextAuthConfig;
