import { Member } from "./member";

export type FamilyMember = {
    id?: number;
    memberId: number | null;
    relatedMemberId: number | null;
    member?: Member | null;
    relatedMember?: Member | null;
    relationship: Relation | any;
    isPayer: boolean;
    created: Date;
    updated: Date | null;
    deleted: Date | null;
};

export enum Relation {
  PARENT = "parent",
  SPOUSE = "spouse",
  CHILD = "child",
  SIBLING = "sibling",
  OTHER = "other"
}
