import { Member } from "./member"
import { Plan } from "./plan";
import { Program } from "./program";

export type MemberPayment = {
  payer: Member;
  program: Program;
  plan: Plan;
  created: Date;
  updated: Date | null;
}