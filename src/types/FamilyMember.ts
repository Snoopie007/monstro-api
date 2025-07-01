import {MemberRelationship} from "./DatabaseEnums";
import {Member} from "./member";

export type FamilyMember = {
  id?: number;
  memberId: number | null;
  relatedMemberId: number | null;
  member?: Member | null;
  relatedMember?: Member | null;
  relationship: MemberRelationship;
  isPayer: boolean;
  created: Date;
  updated: Date | null;
};
