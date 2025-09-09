
import type {
    supportAssistants,
    supportTriggers,
    supportConversations,
    supportMessages
} from "@/db/schemas/";
import type { Member } from "./member";


export type SupportTrigger = typeof supportTriggers.$inferSelect;
export type NewSupportTrigger = typeof supportTriggers.$inferInsert;
export type SupportConversation = typeof supportConversations.$inferSelect & {
    assistant?: SupportAssistant;
    member?: Member;
    messages?: SupportMessage[];
};
export type NewSupportConversation = typeof supportConversations.$inferInsert;
export type SupportAssistant = typeof supportAssistants.$inferSelect & {
    triggers?: SupportTrigger[];
    conversations?: SupportConversation[];
    persona: SupportPersona;
};
export type NewSupportAssistant = typeof supportAssistants.$inferInsert & {
    persona: SupportPersona;
};
export type SupportMessage = typeof supportMessages.$inferSelect;
export type NewSupportMessage = typeof supportMessages.$inferInsert;


export type SupportPersona = {
    name: string;
    avatar: string;
    responseStyle: string;
    personality: string[];
};


export type SupportTools = {
    name: string;
    description: string;
    parameters: Record<string, any>;
    args: Record<string, any>;
};