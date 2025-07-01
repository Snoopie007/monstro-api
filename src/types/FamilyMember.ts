<<<<<<< HEAD
import { familyMembers } from "@/db/schemas";
import { MemberRelationship } from "./DatabaseEnums";
import { Member } from "./member";
=======
import {MemberRelationship} from "./DatabaseEnums";
import {Member} from "./member";
>>>>>>> 22125ebf9f92d05da0f1397f845bbaa8d79a1fe6

export type FamilyMember = typeof familyMembers.$inferInsert & {
  member?: Member;
  relatedMember?: Member;
  relationship: MemberRelationship;
<<<<<<< HEAD
=======
  isPayer: boolean;
  created: Date;
  updated: Date | null;
>>>>>>> 22125ebf9f92d05da0f1397f845bbaa8d79a1fe6
};
