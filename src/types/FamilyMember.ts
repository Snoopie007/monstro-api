import { familyMembers } from "@/db/schemas";
import { MemberRelationship } from "./DatabaseEnums";
import { Member } from "./member";

export type FamilyMember = typeof familyMembers.$inferInsert & {
  member?: Member;
  relatedMember?: Member;
  relationship: MemberRelationship;
};

