import type { Member } from "./member";
import type { Vendor } from "./vendor";
import { users } from "@/db/schemas/users";

export type User = typeof users.$inferSelect & {
  vendor?: Vendor;
  member?: Member;
};
