export type ExtendedUser = DefaultUser["user"] & {
    name: string;
    image: string;
    role: string;
    stripeCustomerId: string;
    phone: string;
    token: string;
    email: string;
    expireTime: Date | null;
    locations: Array<any> | null;
    activeLocation: any | null
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