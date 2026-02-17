import type { Member } from "./member";
import type { Vendor } from "./vendor";
import { users } from "@subtrees/schemas";
import type { Staff } from "./staff";

export type User = typeof users.$inferSelect & {
    vendor?: Vendor;
    member?: Member;
    staff?: Staff;
}

/**
 * Simplified location type from session context
 * Contains only the essential fields needed for client-side location selection
 */
export type SessionLocation = {
    id: string;
    name: string;
    status?: string;
    roles?: any[];
    permissions?: string[];
};

export type ExtendedUser = Partial<User> & {
    id: string;
    name: string;
    image?: string | null;
    username?: string | null;
    discriminator?: number | null;
    role: "vendor" | "staff";
    stripeCustomerId?: string | null;
    phone?: string | null;
    sbToken: string;
    email: string;
    locations: { id: string, name: string, status?: string, roles?: any[], permissions?: string[] }[];
    vendorId?: string;
    staffId?: string;
    createdAt: Date;
    updatedAt: Date;
    emailVerified: boolean;
};

