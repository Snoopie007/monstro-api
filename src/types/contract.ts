import { ContractType } from "./enums";
import { Location } from "./location";
export type Contract = {
    id: number;
    title: string;
    description: string | null;
    locationId: number;
    editable: boolean;
    location: Location;
    isDraft: boolean;
    requireSignature: boolean;
    type: ContractType;
    content: string | null;
    created: Date;
    updated?: Date | null;
    deleted?: Date | null;
}


export type MemberContract = {
    id: number;
    memberId: number;
    contractId: number;
    signed: boolean;
    variables: Record<string, any>;
    signature: string;
    contract?: Contract;
    created: Date;
    updated?: Date | null;
    deleted?: Date | null;
}
