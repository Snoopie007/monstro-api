import { ContractType } from "./DatabaseEnums";
import { Location } from "./location";
import { MemberPackage } from "./member";
import { MemberSubscription } from "./member";
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
    variables: Record<string, unknown>;
    signature: string;
    contract?: Contract;
    subscription?: MemberSubscription | null;
    package?: MemberPackage | null;
    created: Date;
    updated?: Date | null;
    deleted?: Date | null;
}
