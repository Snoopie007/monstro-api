import { Role } from "./role";

export type Staff = {
    id?: number;
    name: string;
    email: string;
    image: string;
    phone: string;
    role: Role;
    status: string;
    created: Date;
    updated: Date;
}
