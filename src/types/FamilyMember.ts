import { familyMembers } from "@/db/schemas";
import { MemberRelationship, FamilyMemberStatus } from "./DatabaseEnums";
import { Member } from "./member";

export type FamilyMember = typeof familyMembers.$inferSelect & {
  member?: Member;
  relatedMember?: Member;
  relationship: MemberRelationship;
  status: FamilyMemberStatus;
  contact?: string | null;
};
