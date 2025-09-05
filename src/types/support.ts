
import type {
    supportBots,
    supportTriggers,
    supportConversations
} from "@/db/schemas/";
export type SupportTrigger = typeof supportTriggers.$inferSelect;
export type NewSupportTrigger = typeof supportTriggers.$inferInsert;
export type SupportConversation = typeof supportConversations.$inferSelect;
export type NewSupportConversation = typeof supportConversations.$inferInsert;
export type SupportBot = typeof supportBots.$inferSelect;
export type NewSupportBot = typeof supportBots.$inferInsert;
