import { ContractType } from "./enums";
import { Location } from "./location";
import { MemberPackage, MemberSubscription } from "./member";

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
    templateId: number;
    locationId: number;
    memberPlanId: number;
    signed: boolean;
    variables: Record<string, unknown>;
    package?: MemberPackage | null;
    subscription?: MemberSubscription | null;
    signature: string;
    contract?: Contract;
    created: Date;
    updated?: Date | null;
    deleted?: Date | null;
}
