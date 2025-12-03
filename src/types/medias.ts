import { media } from "@/db/schemas";

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;