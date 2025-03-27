import { pgEnum } from "drizzle-orm/pg-core";
export const SalesStatusEnum = pgEnum("SalesStatus", ["Pending", "Closed", "Completed", "Cancelled", "Upgraded", "Downgraded"]);