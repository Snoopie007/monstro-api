import { memberHasTags, memberTags } from "../schemas/tags";

export type MemberTag = typeof memberTags.$inferSelect & {
  memberCount?: number; // For admin display showing how many members have this tag
};

export type MemberTagInsert = typeof memberTags.$inferInsert;

export type MemberHasTag = typeof memberHasTags.$inferSelect;

export type MemberHasTagInsert = typeof memberHasTags.$inferInsert;

export type MemberWithTags = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string | null;
  tags?: MemberTag[];
};

export type TagFilter = {
  tagIds: string[];
  operator: "AND" | "OR"; // Whether member must have ALL tags or ANY of the tags
};