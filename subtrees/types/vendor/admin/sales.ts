import { sales } from "@/db/admin";

export type SalesStatus = 'Pending' | 'Closed' | 'Completed' | 'Cancelled' | 'Upgraded' | 'Downgraded';

export type Sale = typeof sales.$inferSelect
