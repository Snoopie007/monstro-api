import { Member } from "./member";
import { Vendor } from "./vendor";
import { users } from "@/db/schemas";
import { Staff } from "./staff";

export type User = typeof users.$inferSelect & {
    vendor?: Vendor;
    member?: Member;
    staff?: Staff;
}

export type ExtendedUser = Partial<User> & {
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

