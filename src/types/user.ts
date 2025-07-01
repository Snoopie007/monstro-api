import { Member } from "./member";
import { Vendor } from "./vendor";
import { users } from "@/db/schemas";

export type User = typeof users.$inferSelect & {
    password?: string;
    vendor?: Vendor;
    member?: Member;
}

