import { CredentialsSignin, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db/db";
import { encodeId } from "./libs/server/sqids";
import { SignJWT } from "jose";


export class CustomAuthError extends CredentialsSignin {
	constructor(msg: string) {
		super();
		this.message = msg;
		this.code = msg;
		this.stack = undefined;
	}
}


export default {
	providers: [
		Credentials({
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" }
			},
			authorize: async (credentials) => {

				if (!credentials || !credentials.email || !credentials.password) {
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
									icon: true,
									stripeCustomerId: true,
								},
								with: {
									locations: {
										with: {
											locationState: {
												columns: {
													status: true,
												}
											}
										},
										columns: {
											id: true,
											name: true,
										}
									}
								}
							}
						},
					})


					if (!user || !user.password) throw new CustomAuthError("User not found");

					const match = await bcrypt.compare(`${credentials.password}`, user.password);

					if (!match) throw new CustomAuthError("Invalid Password or Email");

					// Create a JWT token
					const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
					const jwt = await new SignJWT(user).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1d").setIssuedAt().sign(secret);

					const { vendor: { locations, ...vendor }, ...rest } = user;
					const encodedLocations = locations.map(location => {
						const { locationState, ...restData } = location;
						return {
							...restData,
							id: encodeId(location.id),
							status: locationState ? locationState.status : "incomplete"
						}
					});

					return {
						id: rest.id.toString(),
						name: rest.name,
						email: rest.email,
						phone: vendor.phone,
						image: vendor?.icon,
						vendorId: vendor?.id,
						vendorPhone: vendor?.phone,
						stripeCustomerId: vendor?.stripeCustomerId,
						role: 'vendor',
						token: jwt,
						locations: encodedLocations,
					};

				} catch (error) {
					console.log(error);
					if (error instanceof CustomAuthError) {
						throw error;
					}
					throw new CustomAuthError("Something went wrong");
				}
			}
		}),
	],
} satisfies NextAuthConfig;
