import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { ExtendedUser } from "./types/next-auth";

export default {
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "text", placeholder: "email" },
        name: { label: "name", type: "text" },
        id: { label: "id", type: "text" },
        role: { label: "role", type: "text" },
        customRole: { label: "customRole", type: "text" },
        image: { label: "image", type: "text" },
        stripeCustomerId: { label: "stripeCustomerId", type: "text" },
        phone: { label: "phone", type: "text" },
        token: { label: "token", type: "text" },
        locations: { label: "locations", type: "text" },
      },
      authorize: (credentials) => {
        if (!credentials || !credentials.id || !credentials.email) {
          return null;
        }
        try {
          const user: ExtendedUser = {
            id: credentials.id,
            name: credentials.name,
            email: credentials.email,
            image: credentials.image || "",
            stripeCustomerId: credentials.stripeCustomerId,
            role: credentials.role ,
            customRole: JSON.parse(credentials.customRole as string),
            phone: credentials.phone,
            token: credentials.token,
            locations: JSON.parse(credentials.locations as string),
          };
          return user;

        } catch (e) {
          return null;
        }
      }
    }),
  ],
} satisfies NextAuthConfig;
