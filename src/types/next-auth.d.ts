export type ExtendedUser = DefaultUser["user"] & {
    name: string;
    image: string;
    role: string;
    stripeCustomerId: string;
    phone: string;
    sbToken: string;
    email: string;
    locations: { id: string, name: string, status: string, roles?: any[], permissions?: string[] }[] | null;
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