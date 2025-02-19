import { Member } from "./member";
import { Vendor } from "./vendor";

export type User = {
    id: number;
    name: string;
    email: string;
    emailVerified: Date | null;
    password?: string;
    vendor?: Vendor;
    member?: Member;
}

