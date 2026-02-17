import { sql } from 'drizzle-orm'
import {
    jsonb,
    numeric,
    pgTable,
    text,
    timestamp,
    unique,
} from 'drizzle-orm/pg-core'
import { locations } from './locations'
import { assistantStatusEnum, botModelEnum } from './SupportBotEnums'

import type { SupportPersona } from '../types'
import type { KnowledgeBase } from '../types/KnowledgeBase'

// Single support bot per location
export const supportAssistants = pgTable('support_assistants', {
    id: text('id')
        .primaryKey()
        .default(sql`uuid_base62()`),
    locationId: text('location_id')
        .notNull()
        .references(() => locations.id, { onDelete: 'cascade' }),
    prompt: text('prompt')
        .notNull()
        .default(
            ''
        ),
    temperature: numeric('temperature').notNull().default('0.7'),
    initialMessage: text('initial_message')
        .notNull()
        .default(""),
    model: botModelEnum('model').notNull().default('gpt'),
    modelId: text('model_id').notNull(),
    status: assistantStatusEnum('status').notNull().default('Draft'),
    availableTools: jsonb('available_tools')
        .array()
        .notNull()
        .$default(() => []),
    persona: jsonb('persona')
        .$type<SupportPersona>()
        .notNull()
        .default(sql`'{}'::jsonb`),
    knowledgeBase: jsonb('knowledge_base')
        .$type<KnowledgeBase>()
        .notNull()
        .default(sql`'{}'::jsonb`),
    created: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
},
    (t) => [unique('support_bots_location_unique').on(t.locationId)]
)
