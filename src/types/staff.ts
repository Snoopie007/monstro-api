import { Role } from "./role";

export type Staff = {
    id?: number;
    firstName: string;
    lastName: string;
    email: string;
    image: string;
    phone: string;
    role: Role;
    status: string;
    created: Date;
    updated: Date;
}
