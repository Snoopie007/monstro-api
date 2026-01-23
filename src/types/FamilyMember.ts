import { familyMembers } from "@/db/schemas";
import type { FamilyMemberStatus, MemberRelationship } from "./DatabaseEnums";
import type { Member } from "./member";

export type FamilyMember = typeof familyMembers.$inferSelect & {
  member?: Member;
  relatedMember?: Member;
  relationship: MemberRelationship;
  status: FamilyMemberStatus;
};
