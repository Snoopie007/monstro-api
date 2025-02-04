import { Member } from "./member";
import { Vendor } from "./vendor";

export type Transaction = {
    id: number;
    description: string;
    statementDescription: string;
    paymentMethod: string;
    direction: string;
    type: string;
    amount: string;
    locationId: number;
    status: string;
    model: string;
    memberPlanId?: number | null;
    memberId?: number | null;
    vendorId?: number | null;
    vendor?: Vendor;
    member?: Member;
    created: Date;
    updated?: Date | null;
    deleted?: Date | null;
};