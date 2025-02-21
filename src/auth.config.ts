import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db/db";
import { tryCatch } from "./libs/utils";
import { encodeId } from "./libs/server/sqids";

export default {
	providers: [
		Credentials({
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			authorize: async (credentials) => {

				if (!credentials || !credentials.email || !credentials.password) {
					return null;
				}

				const user = await db.query.users.findFirst({
					where: (user, { eq }) => eq(user.email, `${credentials.email}`),
					with: {
						vendor: {
							columns: {
								id: true,
								phone: true,
								icon: true,
								stripeCustomerId: true,
								onboarding: true
							},
							with: {
								locations: {
									where: (locations, { eq, or }) => or(eq(locations.status, 'Active'), eq(locations.status, 'Pending')),
									columns: {
										id: true,
										name: true
									}
								}
							}
						}
					},
				})


				if (!user || !user.password) return null;

				const match = await bcrypt.compare(`${credentials.password}`, user.password);

				if (!match) return null;

				const { result, error } = await tryCatch(
					fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
						method: "POST",
						headers: { "Content-type": "application/json" },
						body: JSON.stringify({
							email: credentials.email,
						}),
					})
				)


				if (error || !result || !result.ok) return null;

				const { data: { token } } = await result.json();

				const { vendor: { locations, ...vendor }, ...rest } = user;
				const encodedLocations = locations.map(location => ({
					...location,
					id: encodeId(location.id)
				}));
				return {
					id: rest.id.toString(),
					name: rest.name,
					email: rest.email,
					phone: vendor.phone,
					image: vendor?.icon,
					vendorId: vendor?.id,
					vendorPhone: vendor?.phone,
					onboarding: vendor?.onboarding,
					stripeCustomerId: vendor?.stripeCustomerId,
					role: 'vendor',
					token: token,
					locations: encodedLocations,
					permissions: {}
				};

			}
		}),
	],
} satisfies NextAuthConfig;
