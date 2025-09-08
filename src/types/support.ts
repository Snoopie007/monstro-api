
import type {
    supportAssistants,
    supportTriggers,
    supportConversations,
    supportMessages
} from "@/db/schemas/";


export type SupportTrigger = typeof supportTriggers.$inferSelect;
export type NewSupportTrigger = typeof supportTriggers.$inferInsert;
export type SupportConversation = typeof supportConversations.$inferSelect;
export type NewSupportConversation = typeof supportConversations.$inferInsert;
export type SupportAssistant = typeof supportAssistants.$inferSelect & {
    triggers: SupportTrigger[];
    conversations: SupportConversation[];
    persona: SupportPersona;
};
export type NewSupportAssistant = typeof supportAssistants.$inferInsert & {
    persona: SupportPersona;
};
export type SupportMessage = typeof supportMessages.$inferSelect;
export type NewSupportMessage = typeof supportMessages.$inferInsert;


type SupportPersona = {
    name: string;
    avatar: string;
    responseStyle: string;
    personality: string[];
};