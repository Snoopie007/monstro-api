import { Member } from "./member";
import { Vendor } from "./vendor";
import { users } from "@/db/schemas";
import { Staff } from "./staff";

export type User = typeof users.$inferSelect & {

    vendor?: Vendor;
    member?: Member;
    staff?: Staff;
}

