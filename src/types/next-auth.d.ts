export type ExtendedUser = DefaultUser["user"] & {
    name: string;
    image: string;
    role: string;
    stripeCustomerId: string;
    phone: string;
    currentLocationId: string | null;
    token: string;
    email: string;
    expireTime: Date | null;
    locations: Record<string, unknown>[] | null;
    vendorId: number | 0,
    staffId: number | 0
};

declare module "next-auth" {
    interface Session {
        user: ExtendedUser;
    }
}


declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
    }
}