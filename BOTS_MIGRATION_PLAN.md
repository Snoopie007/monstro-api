# 🤖 Bot Migration Plan: Monstro-Bots → Monstro-15

## 📋 **Migration Overview**

**Goal**: Migrate complete bot functionality from `monstro-bots` into `monstro-15`, replacing the current AI page, while integrating bot interactions with the existing Members system instead of creating a separate Contacts table.

**Target**: Replace `/src/app/dashboard/location/[id]/ai/` in monstro-15 with full bots functionality from monstro-bots.

**Key Decision**: Use hybrid approach with Members + lightweight Guest Contacts instead of separate Contacts table.

---

## 🗄️ **Phase 1: Database Schema Migration**

### **1.1 Create Bot Enums**
Create `/src/db/schemas/BotEnums.ts`:
```sql
-- New enums for bot functionality
CREATE TYPE bot_status AS ENUM ('Draft', 'Active', 'Pause', 'Archived');
CREATE TYPE channel AS ENUM ('SMS', 'AI', 'Facebook', 'Google', 'WhatsApp', 'WebChat', 'Email', 'Contact', 'System');
CREATE TYPE message_role AS ENUM ('user', 'ai', 'contact', 'system', 'tool', 'tool_response');
CREATE TYPE bot_model AS ENUM ('anthropic', 'gpt', 'gemini');
CREATE TYPE workflow_status AS ENUM ('Draft', 'Active', 'Pause', 'Archived');
CREATE TYPE workflow_queue_status AS ENUM ('Processing', 'Completed', 'Failed', 'Cancelled');
CREATE TYPE document_type AS ENUM ('file', 'website');
CREATE TYPE ticket_status AS ENUM ('open', 'resolved');

### **1.2 Create Bot Enums in TypeScript**
Create `/src/db/schemas/BotEnums.ts` with TypeScript enums:
```typescript
import { pgEnum } from "drizzle-orm/pg-core";
export enum BotStatus {
    Draft = 'Draft',
    Active = 'Active',
    Pause = 'Pause',
    Archived = 'Archived'
}

export enum Channel {
    SMS = 'SMS',
    AI = 'AI',
    Facebook = 'Facebook',
    Google = 'Google',
    WhatsApp = 'WhatsApp',
    WebChat = 'WebChat',
    Email = 'Email',
    Contact = 'Contact',
    System = 'System'
}

export enum MessageRole {
    User = 'user',
    AI = 'ai',
    Contact = 'contact',
    System = 'system',
    Tool = 'tool',
    ToolResponse = 'tool_response'
}

export enum BotModel {
    Anthropic = 'anthropic',
    GPT = 'gpt',
    Gemini = 'gemini'
}

export enum WorkflowStatus {
    Draft = 'Draft',
    Active = 'Active',
    Pause = 'Pause',
    Archived = 'Archived'
}

export enum WorkflowQueueStatus {
    Processing = 'Processing',
    Completed = 'Completed',
    Failed = 'Failed',
    Cancelled = 'Cancelled'
}

export enum DocumentType {
    File = 'file',
    Website = 'website'
}

export enum TicketStatus {
    Open = 'open',
    Resolved = 'resolved'
}

export const ticketStatusEnum = pgEnum("ticket_status", [
    TicketStatus.Open,
    TicketStatus.Resolved,
]);
```
```

### **1.2 Extend Existing Members System**
```sql
-- Add bot-specific fields to existing memberLocations table
ALTER TABLE member_locations ADD COLUMN bot_metadata JSONB DEFAULT '{}';
ALTER TABLE member_locations ADD COLUMN last_bot_interaction TIMESTAMPTZ;
```

### **1.3 Create Guest Contacts Table (For Non-Members)**
```sql
-- Lightweight table for non-authenticated bot interactions
CREATE TABLE guest_contacts (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    bot_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(location_id, email)
);
```

### **1.4 Create Core Bot Tables**
```sql
-- Main bots table
CREATE TABLE bots (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    name TEXT,
    prompt TEXT NOT NULL DEFAULT '',
    location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    temperature INTEGER NOT NULL DEFAULT 0,
    initial_message TEXT,
    model bot_model NOT NULL DEFAULT 'gpt',
    objectives JSONB[] NOT NULL DEFAULT '{}',
    invalid_nodes TEXT[] NOT NULL DEFAULT '{}',
    status bot_status NOT NULL DEFAULT 'Draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- AI personas
CREATE TABLE ai_persona (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image TEXT,
    response_details TEXT NOT NULL DEFAULT '',
    personality TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Bot-persona relationships
CREATE TABLE bot_personas (
    bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    persona_id TEXT NOT NULL REFERENCES ai_persona(id) ON DELETE CASCADE,
    UNIQUE(bot_id, persona_id)
);

-- Bot scenarios (triggers and workflows)
CREATE TABLE bot_scenarios (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    name TEXT NOT NULL,
    bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    workflow_id TEXT REFERENCES workflows(id) ON DELETE SET NULL,
    routine_id TEXT REFERENCES bots(id) ON DELETE SET NULL,
    trigger TEXT NOT NULL,
    examples TEXT[] NOT NULL DEFAULT '{}',
    requirements TEXT[] NOT NULL DEFAULT '{}',
    yield BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    UNIQUE(bot_id, routine_id)
);

-- Bot templates
CREATE TABLE bot_templates (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    name TEXT NOT NULL,
    description TEXT,
    prompt TEXT NOT NULL DEFAULT '',
    response_details TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL,
    initial_message TEXT,
    invalid_nodes TEXT[] NOT NULL DEFAULT '{}',
    objectives JSONB[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
```

### **1.5 Create Knowledge Base Tables**
```sql
-- Documents for knowledge base
CREATE TABLE documents (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    name TEXT NOT NULL,
    file_path TEXT,
    url TEXT,
    type document_type NOT NULL,
    location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    size INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Document processing metadata
CREATE TABLE document_metadata (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(document_id)
);

-- Document chunks for RAG
CREATE TABLE document_chunks (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(384)
);

-- Bot-knowledge relationships
CREATE TABLE bot_knowledge (
    bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    UNIQUE(bot_id, document_id)
);
```

### **1.6 Create Conversation Tables (Hybrid Member/Guest Support)**
```sql
-- Conversations supporting both members and guests
CREATE TABLE conversations (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    
    -- Either member_id OR guest_contact_id (not both)
    member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
    guest_contact_id TEXT REFERENCES guest_contacts(id) ON DELETE CASCADE,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    
    CONSTRAINT conversation_contact_check CHECK (
        (member_id IS NOT NULL AND guest_contact_id IS NULL) OR
        (member_id IS NULL AND guest_contact_id IS NOT NULL)
    )
);

-- Messages in conversations
CREATE TABLE messages (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    role message_role NOT NULL,
    channel channel NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bot progress tracking (hybrid member/guest)
CREATE TABLE bot_progress (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    
    -- Either member_id OR guest_contact_id
    member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
    guest_contact_id TEXT REFERENCES guest_contacts(id) ON DELETE CASCADE,
    
    completed BOOLEAN DEFAULT FALSE,
    current_node TEXT NOT NULL,
    stopped TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT bot_progress_contact_check CHECK (
        (member_id IS NOT NULL AND guest_contact_id IS NULL) OR
        (member_id IS NULL AND guest_contact_id IS NOT NULL)
    )
);

-- Tickets for tracking issues
CREATE TABLE tickets (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    status ticket_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

-- Bot interaction logs
CREATE TABLE bot_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
    guest_contact_id TEXT REFERENCES guest_contacts(id) ON DELETE CASCADE,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### **1.7 Create Workflow Tables**
```sql
-- Workflows for bot scenarios
CREATE TABLE workflows (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status workflow_status NOT NULL DEFAULT 'Draft',
    nodes JSONB[] NOT NULL DEFAULT ARRAY[]::jsonb[],
    invalid_nodes TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Workflow triggers
CREATE TABLE workflow_triggers (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'
);

-- Workflow execution queue
CREATE TABLE workflow_queues (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
    guest_contact_id TEXT REFERENCES guest_contacts(id) ON DELETE CASCADE,
    current_node TEXT NOT NULL DEFAULT 'start',
    stopped TEXT,
    status workflow_queue_status NOT NULL DEFAULT 'Processing',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Workflow execution logs
CREATE TABLE workflow_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    queue_id TEXT NOT NULL REFERENCES workflow_queues(id) ON DELETE CASCADE,
    metadata JSONB NOT NULL DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
```

### **1.7 Create Ticket Schema**
Create `/src/db/schemas/tickets.ts`:
```typescript
import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { conversations } from "./conversations";
import { ticketStatusEnum } from "./BotEnums";

export const tickets = pgTable("tickets", {
    id: text("id").primaryKey().default("uuid_base62()"),
    conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    status: ticketStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
    metadata: jsonb("metadata").default("{}"),
});

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
```

### **1.8 Update Schema Index**
Update `/src/db/schemas/index.ts`:
```typescript
// Existing exports
export * from "./users";
export * from "./locations";
export * from "./members";
// ... all existing exports

// NEW BOT SCHEMAS
export * from "./BotEnums";
export * from "./bots";
export * from "./documents";
export * from "./conversations";
export * from "./workflows";
export * from "./guestContacts";
export * from "./tickets";
```

---

## 📦 **Phase 2: Dependencies & Environment**

### **2.1 Update package.json in monstro-15**
```json
{
  "dependencies": {
    // LangChain Core Dependencies (P0)
    "@langchain/core": "^0.3.21",
    "@langchain/anthropic": "^0.3.21",
    "@langchain/openai": "^4.3.9",
    "@langchain/google-genai": "^0.2.10",
    "@langchain/community": "^0.3.21",
    "@langchain/textsplitters": "^0.3.21",
    
    // AI Processing & Streaming (P0)
    "ai": "^4.3.9",
    "openai": "^4.67.1",
    "@anthropic-ai/sdk": "^0.30.1",
    
    // Node Flow Processing Queue (P0)
    "bullmq": "^5.53.3",
    "ioredis": "^5.4.1",
    
    // Session Management (P0)
    "@upstash/redis": "^1.34.4",
    
    // Visual Node Builder (P0)
    "@xyflow/react": "^12.0.4",
    "@xyflow/node-resizer": "^3.0.4",
    
    // Document Processing (P0)
    "pdf-parse": "^1.1.1",
    "csv-parse": "^5.6.0",
    "@mendable/firecrawl-js": "^1.25.5",
    
    // Embeddings & Vector DB (P0)
    "@xenova/transformers": "^2.13.4",
    "@huggingface/inference": "^2.8.0",
    
    // UI Components (if missing)
    "@radix-ui/react-accordion": "^1.2.0",
    "@radix-ui/react-slider": "^1.3.5",
    "@radix-ui/react-toast": "^1.2.1",
    
    // Upgrade existing
    "drizzle-orm": "^0.40.1"
  }
}
```

### **2.2 Environment Variables**
Add to `.env.local`:
```env
# AI Models (P0)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_AI_API_KEY=your_google_key

# Session Management (P0)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Node Flow Processing (P0)
REDIS_URL=your_redis_url_for_queues
REDIS_TOKEN=your_redis_token_for_queues

# Vector DB & Embeddings (P0)
PINECONE_API_KEY=your_pinecone_key
PINECONE_ENVIRONMENT=your_pinecone_env
HUGGINGFACE_API_KEY=your_hf_key

# Security
MONSTRO_API_KEY=your_internal_api_key
```

### **2.3 Database Extensions**
```sql
-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 🔧 **Phase 3: Backend API Migration**

### **3.1 Create Core Bot API Routes**

#### `/src/app/api/protected/loc/[id]/bots/route.ts`
```typescript
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    // Fetch all bots for location with relations
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    // Create new bot for location
}
```

#### `/src/app/api/protected/loc/[id]/bots/[bid]/route.ts`
```typescript
export async function GET() { /* Get specific bot */ }
export async function PUT() { /* Update bot */ }
export async function DELETE() { /* Delete bot */ }
```

#### `/src/app/api/protected/loc/[id]/bots/[bid]/chat/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { LangChainAdapter } from 'ai';
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { UpstashRedisChatMessageHistory } from "@langchain/community/stores/message/upstash_redis";
import { ChatPromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { BaseMessage, trimMessages } from '@langchain/core/messages';
import { db } from '@/db/db';
import { getRedisClient, getQueueClient } from '@/libs/server/redis';
import { formattedPrompt, getModel, Tools, FunctionDefaults } from '@/libs/server/ai';

type SessionContext = {
    id: string;
    botId: string;
    currentNode: string;
    routineNode: string | null;
    stopped: string | null;
    metadata: {
        location: any;
        contact: any;
        isTestSession: boolean;
    };
};

const TTL = 60 * 60 * 2; // 2 hours
const redis = getRedisClient();
const queue = getQueueClient();

export async function POST(req: NextRequest, props: { params: Promise<{ id: string, bid: string }> }) {
    const { id, bid } = await props.params;
    const { messages, sessionId, testContact } = await req.json();

    if (!messages?.length || !sessionId) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    try {
        // Queue the chat processing job for node flow execution
        await queue.add('process-admin-chat', {
            locationId: id,
            botId: bid,
            messages,
            sessionId,
            testContact,
            isAdminTest: true
        }, {
            removeOnComplete: 10,
            removeOnFail: 5
        });

        return NextResponse.json({ 
            message: "Chat processing queued",
            sessionId 
        }, { status: 200 });

    } catch (error) {
        console.error("Chat API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
```

### **3.2 Scenario Management APIs**

#### `/src/app/api/protected/bots/[bid]/scenario/route.ts`
```typescript
export async function POST() { /* Create scenario */ }
export async function DELETE() { /* Delete scenario */ }
```

### **3.3 Knowledge Base APIs**

#### `/src/app/api/protected/loc/[id]/documents/route.ts`
```typescript
export async function GET() { /* List documents */ }
export async function POST() { /* Upload & process document */ }
```

### **3.4 Node Flow Queue Processing APIs**

#### `/src/app/api/protected/loc/[id]/bots/[bid]/queue/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getQueueClient } from '@/libs/server/redis';

// Queue chat processing for node flow execution
export async function POST(req: NextRequest, props: { params: Promise<{ id: string, bid: string }> }) {
    const { id, bid } = await props.params;
    const { messages, sessionId, testContact, memberId, conversationId } = await req.json();
    
    try {
        const queue = getQueueClient();
        
        if (memberId) {
            // Member chat processing
            await queue.add('process-member-chat', {
                locationId: id,
                botId: bid,
                messages,
                memberId,
                conversationId
            }, {
                removeOnComplete: 10,
                removeOnFail: 5
            });
        } else {
            // Admin test chat processing
            await queue.add('process-admin-chat', {
                locationId: id,
                botId: bid,
                messages,
                sessionId,
                testContact
            }, {
                removeOnComplete: 10,
                removeOnFail: 5
            });
        }
        
        return NextResponse.json({ 
            message: "Chat processing queued",
            sessionId: sessionId || `member-${memberId}-${bid}`
        }, { status: 200 });
        
    } catch (error) {
        console.error("Queue processing error:", error);
        return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
}
```

### **3.5 Ticket Management APIs**
Create ticket management endpoints for tracking and updating issue status:

#### `/src/app/api/protected/loc/[id]/tickets/route.ts`
```typescript
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    // Fetch all tickets for location with conversation context
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    // Create new ticket for a conversation
}
```

#### `/src/app/api/protected/loc/[id]/tickets/[tid]/route.ts`
```typescript
export async function GET() { /* Get specific ticket */ }
export async function PUT() { /* Update ticket status */ }
export async function DELETE() { /* Delete ticket */ }
```

#### `/src/app/api/protected/loc/[id]/tickets/[tid]/status/route.ts`
```typescript
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string, tid: string }> }) {
    // Update ticket status (for bot tool calls)
}
```

### **3.6 Contact Management APIs (Hybrid)"

#### `/src/app/api/protected/loc/[id]/contacts/route.ts`
```typescript
// Unified contact API that returns both members and guests
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;
    
    // Fetch members from memberLocations
    const members = await db.query.memberLocations.findMany({
        where: (ml, { eq }) => eq(ml.locationId, id),
        with: { member: true }
    });
    
    // Fetch guest contacts
    const guests = await db.query.guestContacts.findMany({
        where: (gc, { eq }) => eq(gc.locationId, id)
    });
    
    // Return unified contact list
    return NextResponse.json({
        members: members.map(ml => ({ ...ml.member, type: 'member' })),
        guests: guests.map(g => ({ ...g, type: 'guest' }))
    });
}
```

---

## 🎨 **Phase 4: Frontend Migration**

### **4.1 Replace AI Directory Structure**

**Remove**: `/src/app/dashboard/location/[id]/ai/`
**Create**: `/src/app/dashboard/location/[id]/bots/`

```
/src/app/dashboard/location/[id]/bots/
├── layout.tsx
├── page.tsx                    # Main bots dashboard
├── builder/
│   └── [bid]/
│       ├── page.tsx           # Visual node builder interface
│       ├── BotBuilder.tsx     # Main ReactFlow canvas
│       ├── components/
│       │   ├── NodeSelector/  # Add new nodes
│       │   ├── NodeSettings/  # Configure nodes
│       │   ├── NodeForms/     # Node type forms
│       │   ├── CustomNodes/   # Node components
│       │   ├── CustomEdges/   # Edge components
│       │   └── Menu/          # Builder toolbar
│       ├── providers/
│       │   └── BotBuilderProvider.tsx # Builder state
│       └── utils/
│           └── nodeUtils.ts   # Helper functions
├── knowledges/
│   └── page.tsx               # Knowledge base management
├── providers/
│   └── BotProvider.tsx        # Bot context & state
├── components/
│   ├── Botlist.tsx           # Bot selection panel
│   ├── BotInfo.tsx           # Bot configuration panel (with Flow Builder tab)
│   ├── Chat/
│   │   ├── AIChatBox.tsx     # Main chat testing interface
│   │   ├── AIChatProvider.tsx # Chat state management
│   │   ├── ChatInput.tsx     # Message input
│   │   ├── ChatMessages.tsx  # Message display
│   │   └── ContactSelect.tsx # Test contact selection
│   ├── Settings/
│   │   └── Scenario/
│   │       ├── NewScenario.tsx    # Create scenario dialog
│   │       └── ScenarioComp.tsx   # Scenario management
│   └── schemas.ts            # Form validation schemas
└── hooks/
    └── useBots.ts           # Bot data fetching
```

### **4.2 Main Bots Page**

#### `/src/app/dashboard/location/[id]/bots/page.tsx`
```typescript
import { db } from "@/db/db";
import { Botlist, AIChatBox, BotInfo, AIChatProvider } from "./components";

export default async function BotsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    
    // Fetch location
    const location = await db.query.locations.findFirst({
        where: (locations, { eq }) => eq(locations.id, params.id),
    });
    
    // Fetch bot-related data
    const [templates, personas, docs] = await Promise.all([
        db.query.botTemplates.findMany(),
        db.query.aiPersona.findMany({
            where: (persona, { eq }) => eq(persona.locationId, params.id)
        }),
        db.query.documents.findMany({
            where: (doc, { eq }) => eq(doc.locationId, params.id)
        })
    ]);

    return (
        <div className='flex flex-row h-[calc(100vh-58px)] p-2 gap-2'>
            {/* Left Panel: Bot Management */}
            <div className="flex flex-row gap-2 flex-3/6">
                <Botlist lid={params.id} templates={templates} />
                <BotInfo lid={params.id} personas={personas} docs={docs} />
            </div>
            
            {/* Right Panel: Bot Testing Chat */}
            <div className="flex-3/6">
                <AIChatProvider>
                    <AIChatBox location={location} />
                </AIChatProvider>
            </div>
        </div>
    )
}
```

### **4.3 Update Navigation**
Update dashboard navigation to replace AI link:
```typescript
// Change from: /dashboard/location/[id]/ai
// To: /dashboard/location/[id]/bots
```

---

## 🏗️ **Phase 5: Server Utilities Migration**

### **5.1 AI Server Libraries**

#### `/src/libs/server/ai/index.ts`
```typescript
export * from "./models";
export * from "./prompts";
export * from "./tools";
export * from "./costs";
export * from "./streaming";
```

#### `/src/libs/server/ai/models.ts`
```typescript
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export function getModel(model: "anthropic" | "gpt" | "gemini", onUsage?: (output: any) => void) {
    switch (model) {
        case "anthropic":
            return new ChatAnthropic({
                modelName: "claude-3-sonnet-20240229",
                callbacks: onUsage ? [{ handleLLMEnd: onUsage }] : undefined,
            });
        case "gpt":
            return new ChatOpenAI({
                modelName: "gpt-4",
                callbacks: onUsage ? [{ handleLLMEnd: onUsage }] : undefined,
            });
        case "gemini":
            return new ChatGoogleGenerativeAI({
                modelName: "gemini-pro",
                callbacks: onUsage ? [{ handleLLMEnd: onUsage }] : undefined,
            });
    }
}
```

### **5.2 Contact Helper Functions**

#### `/src/libs/server/contacts.ts`
```typescript
// Unified contact access for bot interactions
export async function getContactInfo(conversation: Conversation) {
    if (conversation.memberId) {
        // Get member info with location relationship
        const memberLocation = await db.query.memberLocations.findFirst({
            where: (ml, { eq, and }) => and(
                eq(ml.memberId, conversation.memberId),
                eq(ml.locationId, conversation.locationId)
            ),
            with: { member: true }
        });
        
        return {
            id: memberLocation.member.id,
            firstName: memberLocation.member.firstName,
            lastName: memberLocation.member.lastName,
            email: memberLocation.member.email,
            phone: memberLocation.member.phone,
            type: 'member' as const,
            botMetadata: memberLocation.botMetadata || {}
        };
    } else {
        // Get guest contact info
        const guest = await db.query.guestContacts.findFirst({
            where: (g, { eq }) => eq(g.id, conversation.guestContactId)
        });
        
        return {
            id: guest.id,
            firstName: guest.firstName,
            lastName: guest.lastName,
            email: guest.email,
            phone: guest.phone,
            type: 'guest' as const,
            botMetadata: guest.botMetadata || {}
        };
    }
}

// Helper to promote guest to member
export async function promoteGuestToMember(guestId: string, newMemberId: string) {
    await db.transaction(async (tx) => {
        // Update conversations
        await tx.update(conversations)
            .set({ memberId: newMemberId, guestContactId: null })
            .where(eq(conversations.guestContactId, guestId));
            
        // Update bot progress
        await tx.update(botProgress)
            .set({ memberId: newMemberId, guestContactId: null })
            .where(eq(botProgress.guestContactId, guestId));
            
        // Update bot logs
        await tx.update(botLogs)
            .set({ memberId: newMemberId, guestContactId: null })
            .where(eq(botLogs.guestContactId, guestId));
            
        // Delete guest record
        await tx.delete(guestContacts).where(eq(guestContacts.id, guestId));
    });
}
```

### **5.3 Redis & Queue Configuration**

#### `/src/libs/server/redis.ts`
```typescript
import { Redis } from "@upstash/redis";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

// Upstash Redis for sessions
export function getRedisClient() {
    return new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
}

// IORedis for BullMQ queues (node flow processing)
export function getIORedisClient() {
    return new IORedis({
        host: process.env.REDIS_HOST!,
        port: parseInt(process.env.REDIS_PORT!),
        password: process.env.REDIS_PASSWORD!,
        maxRetriesPerRequest: 3,
    });
}

// Queue for node flow processing
export function getQueueClient() {
    const connection = getIORedisClient();
    return new Queue('bot-processing', { connection });
}

// Worker for processing node flows
export function createNodeFlowWorker() {
    const connection = getIORedisClient();
    
    return new Worker('bot-processing', async (job) => {
        const { data } = job;
        
        switch (job.name) {
            case 'process-admin-chat':
                return await processAdminChat(data);
            case 'process-member-chat':
                return await processMemberChat(data);
            default:
                throw new Error(`Unknown job type: ${job.name}`);
        }
    }, { connection });
}

// Import processing functions
import { processAdminChat, processMemberChat } from './ai/node-processor';
```

### **5.4 Node Flow Processing Engine**

#### `/src/libs/server/ai/node-processor.ts`
```typescript
import { db } from '@/db/db';
import { getModel } from './models';
import { UpstashRedisChatMessageHistory } from "@langchain/community/stores/message/upstash_redis";
import { ChatPromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { BaseMessage, trimMessages } from '@langchain/core/messages';
import { getRedisClient } from '../redis';
import { Tools, FunctionDefaults, formattedPrompt } from './tools';

type SessionContext = {
    id: string;
    botId: string;
    currentNode: string;
    routineNode: string | null;
    stopped: string | null;
    metadata: {
        location: any;
        contact: any;
        isTestSession?: boolean;
        memberId?: string;
    };
};

// Process admin test chat (dummy member chat behavior)
export async function processAdminChat(data: any) {
    const { locationId, botId, messages, sessionId, testContact } = data;
    
    try {
        // Fetch location and bot
        const [location, bot] = await Promise.all([
            db.query.locations.findFirst({
                where: (locations, { eq }) => eq(locations.id, locationId)
            }),
            db.query.bots.findFirst({
                where: (bots, { eq, and }) => and(
                    eq(bots.id, botId),
                    eq(bots.locationId, locationId)
                ),
                with: {
                    persona: { with: { aiPersona: true } },
                    knowledge: { with: { document: true } }
                }
            })
        ]);

        if (!location || !bot) {
            throw new Error("Location or bot not found");
        }

        // Get or create session
        const redis = getRedisClient();
        let session = await redis.json.get(`test-session:${botId}:${sessionId}`) as SessionContext | null;

        if (!session) {
            session = {
                id: sessionId,
                botId,
                currentNode: bot.objectives?.[0]?.id || 'start',
                routineNode: null,
                stopped: null,
                metadata: {
                    location,
                    contact: testContact || { id: 'test', firstName: 'Test', lastName: 'User', type: 'test' },
                    isTestSession: true
                }
            };
        }

        // Initialize chat history
        const history = new UpstashRedisChatMessageHistory({
            sessionId: `test-chat:${botId}:${sessionId}`,
            client: redis,
            sessionTTL: 60 * 60 * 2,
        });

        // Add user message
        const userMessage = messages[messages.length - 1];
        await history.addUserMessage(userMessage.content);

        // Process through node flow
        const model = getModel(bot.model);
        const response = await processNodeFlow(session, bot, model, history);

        // Save session
        await saveSession(session, redis);

        return {
            success: true,
            response,
            sessionId,
            currentNode: session.currentNode
        };

    } catch (error) {
        console.error("Admin chat processing error:", error);
        throw error;
    }
}

// Process member chat (same behavior as admin test)
export async function processMemberChat(data: any) {
    const { locationId, botId, messages, memberId, conversationId } = data;
    
    try {
        // Fetch member, location and bot
        const [memberLocation, bot] = await Promise.all([
            db.query.memberLocations.findFirst({
                where: (ml, { eq, and }) => and(
                    eq(ml.locationId, locationId),
                    eq(ml.memberId, memberId)
                ),
                with: { member: true, location: true }
            }),
            db.query.bots.findFirst({
                where: (bots, { eq, and }) => and(
                    eq(bots.id, botId),
                    eq(bots.locationId, locationId)
                ),
                with: {
                    persona: { with: { aiPersona: true } },
                    knowledge: { with: { document: true } }
                }
            })
        ]);

        if (!memberLocation || !bot) {
            throw new Error("Member, location, or bot not found");
        }

        // Get or create session
        const redis = getRedisClient();
        const sessionId = `member-${memberId}-${botId}`;
        let session = await redis.json.get(`session:${sessionId}`) as SessionContext | null;

        if (!session) {
            session = {
                id: sessionId,
                botId,
                currentNode: bot.objectives?.[0]?.id || 'start',
                routineNode: null,
                stopped: null,
                metadata: {
                    location: memberLocation.location,
                    contact: {
                        id: memberLocation.member.id,
                        firstName: memberLocation.member.firstName,
                        lastName: memberLocation.member.lastName,
                        email: memberLocation.member.email,
                        phone: memberLocation.member.phone,
                        type: 'member'
                    },
                    memberId,
                    isTestSession: false
                }
            };
        }

        // Initialize chat history with conversation ID
        const history = new UpstashRedisChatMessageHistory({
            sessionId: `member-chat:${conversationId}`,
            client: redis,
            sessionTTL: 60 * 60 * 24 * 30, // 30 days for members
        });

        // Add user message
        const userMessage = messages[messages.length - 1];
        await history.addUserMessage(userMessage.content);

        // Process through node flow (same as admin)
        const model = getModel(bot.model);
        const response = await processNodeFlow(session, bot, model, history);

        // Save session
        await saveSession(session, redis);

        // Save messages to database for persistence
        await Promise.all([
            // Save user message
            db.insert(messages).values({
                conversationId,
                content: userMessage.content,
                role: 'user',
                channel: 'WebChat'
            }),
            // Save AI response
            db.insert(messages).values({
                conversationId,
                content: response,
                role: 'ai',
                channel: 'WebChat',
                metadata: {
                    nodeId: session.currentNode,
                    model: bot.model
                }
            })
        ]);

        return {
            success: true,
            response,
            sessionId,
            currentNode: session.currentNode
        };

    } catch (error) {
        console.error("Member chat processing error:", error);
        throw error;
    }
}

// Core node flow processing (used by both admin and member chats)
async function processNodeFlow(
    session: SessionContext,
    bot: any,
    model: any,
    history: UpstashRedisChatMessageHistory
): Promise<string> {
    
    const currentNode = bot.objectives?.find((obj: any) => obj.id === session.currentNode);
    
    if (!currentNode) {
        throw new Error(`Current node not found: ${session.currentNode}`);
    }

    const { data } = currentNode;
    const tools: any[] = [];

    // Build tools from node functions
    data.functions?.forEach((func: any) => {
        const defaults = FunctionDefaults[func.name as keyof typeof FunctionDefaults];
        tools.push({
            type: "function",
            function: {
                name: func.name,
                description: defaults?.description || func.description || data.goal,
                parameters: {
                    type: "object",
                    properties: defaults?.properties || func.properties || {},
                    required: defaults?.required || func.required || [],
                    strict: func.strict || true
                }
            }
        });
    });

    // Get conversation history
    const messages = await history.getMessages();
    const trimmed = await trimMessages(messages, {
        maxTokens: 1000,
        strategy: "last",
        tokenCounter: model,
    });

    // Build prompt with session context
    const basePrompt = buildBasePrompt(bot, session.metadata);
    const responsePrompt = await formattedPrompt(basePrompt, data);

    const prompt = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(responsePrompt),
        new MessagesPlaceholder("history"),
    ]);

    const modelWithTools = model.bindTools(tools);
    const chain = prompt.pipe(modelWithTools);

    // Generate response
    const response = await chain.invoke({ history: trimmed });
    const responses: BaseMessage[] = [response];

    // Process tool calls (node navigation)
    if (response.tool_calls?.length) {
        for (const toolCall of response.tool_calls) {
            const tool = Tools[toolCall.name as keyof typeof Tools];
            if (tool) {
                const { next: nextNode, message } = await tool(toolCall, currentNode);
                if (nextNode) {
                    session.currentNode = nextNode;
                }
                responses.push(message);
            }
        }
    }

    // Save messages to history
    await history.addMessages(responses);

    return response.content as string;
}

async function saveSession(session: SessionContext, redis: any) {
    const sessionKey = session.metadata.isTestSession 
        ? `test-session:${session.botId}:${session.id}`
        : `session:${session.id}`;
    
    const ttl = session.metadata.isTestSession ? 60 * 60 * 2 : 60 * 60 * 24;
    
    await Promise.all([
        redis.json.set(sessionKey, '$', session),
        redis.expire(sessionKey, ttl)
    ]);
}

function buildBasePrompt(bot: any, metadata: any): string {
    const persona = bot.persona?.aiPersona;
    
    return `You are ${bot.name}, an AI assistant for ${metadata.location.name}.

${bot.prompt}

${persona ? `
Persona Details:
- Name: ${persona.name}
- Response Style: ${persona.responseDetails}
- Personality Traits: ${persona.personality.join(', ')}
` : ''}

Contact Context:
- Name: ${metadata.contact.firstName} ${metadata.contact.lastName}
- Type: ${metadata.contact.type}
- ${metadata.isTestSession ? 'Test Session: true' : 'Member Session: true'}

Instructions:
- Be helpful and professional
- Use the persona's response style if available
- Follow the conversation flow defined by the nodes
- Use available tools when appropriate
- Navigate between nodes based on user responses and tool outcomes`;
}
```

---

## 🔤 **Phase 6: Types Migration**

### **6.1 Bot Types and Enums**

#### `/src/types/bots.ts` and `/src/types/tickets.ts`
```typescript
export type Bot = {
    id: string
    locationId: string
    name: string | null
    initialMessage: string | null
    prompt: string
    objectives: Node<NodeDataType>[] | null
    temperature: number
    model: "anthropic" | "gpt" | "gemini"
    invalidNodes: string[]
    status: "Draft" | "Active" | "Pause" | "Archived"
    created: Date
    updated: Date | null
}

export type ExtendedBot = Bot & {
    knowledge?: Document,
    botKnowledge?: BotKnowledge
    botPersona?: BotPersona
    persona?: AIPersona
    scenarios?: BotScenario[]
}

export type BotScenario = {
    id: string
    name: string
    botId: string
    workflowId: string | null
    routineId: string | null
    trigger: string
    examples: string[]
    requirements: string[]
    yield: boolean
    created: Date
    updated: Date | null
}

export type NodeDataType = {
    label: string
    goal: string
    paths: Paths
    instructions?: string
    functions?: AIFunction[]
    config?: NodeConfigs
}

// ... all other bot-related types

#### `/src/types/tickets.ts`
```typescript
export type TicketStatus = 'open' | 'resolved';

export type Ticket = {
    id: string;
    conversationId: string;
    status: TicketStatus;
    created: Date;
    updated: Date | null;
    metadata?: Record<string, any>;
};

export type TicketUpdate = {
    status: TicketStatus;
    metadata?: Record<string, any>;
};
```
```

### **6.2 Contact Types (Hybrid)**

#### `/src/types/contacts.ts`
```typescript
export type UnifiedContact = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    type: 'member' | 'guest';
    botMetadata?: Record<string, any>;
    created: Date;
}

export type GuestContact = {
    id: string;
    locationId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    botMetadata: Record<string, any>;
    created: Date;
}

export type MemberContact = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    botMetadata: Record<string, any>;
    memberLocationId: string;
}
```

### **6.3 Document Types**

#### `/src/types/documents.ts`
```typescript
export type DocumentType = 'file' | 'website';

export type Document = {
    id: string;
    name: string;
    filePath: string | null;
    url: string | null;
    type: DocumentType;
    locationId: string;
    size: number | null;
    created: Date;
}

export type DocumentMetadata = {
    id: string;
    documentId: string;
    metadata: Record<string, any>;
    created: Date;
}

export type DocumentChunk = {
    id: string;
    documentId: string;
    content: string;
    embedding?: string;
}
```

---

## 📱 **Phase 7: Member App Integration**

### **7.1 Member App Chat Interface**

The member app (monstro-member) needs a chat interface where members can interact with location bots.

#### **Chat Page Structure**
```
/monstro-member/src/app/[lid]/chat/
├── page.tsx                 # Main chat interface
├── components/
│   ├── ChatContainer.tsx    # Chat wrapper with bot selection
│   ├── ChatMessages.tsx     # Message display
│   ├── ChatInput.tsx        # Message input
│   ├── BotSelector.tsx      # Select active location bots
│   └── ChatProvider.tsx     # Chat state management
└── hooks/
    └── useChat.ts          # Chat functionality hook
```

#### **Main Chat Page**
```typescript
// /monstro-member/src/app/[lid]/chat/page.tsx
import { ChatContainer, ChatProvider } from './components';
import { createClient } from '@/libs/supabase/server';
import { redirect } from 'next/navigation';

export default async function ChatPage(props: { params: Promise<{ lid: string }> }) {
    const { lid } = await props.params;
    const supabase = await createClient();
    
    // Get authenticated user with JWT validation
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
        redirect('/login');
    }
    
    // Fetch member data using authenticated Supabase client
    const { data: memberData } = await supabase
        .from('member_locations')
        .select(`
            member_id,
            members!inner(*)
        `)
        .eq('location_id', lid)
        .eq('members.user_id', user.id)
        .single();
    
    if (!memberData) {
        redirect('/login');
    }
    
    // Fetch active bots for location using Supabase RLS
    const { data: activeBots } = await supabase
        .from('bots')
        .select(`
            id,
            name,
            initial_message,
            bot_personas!left(
                ai_persona!inner(
                    id,
                    name,
                    image,
                    response_details,
                    personality
                )
            )
        `)
        .eq('location_id', lid)
        .eq('status', 'Active');
    
    return (
        <div className="flex flex-col h-screen">
            <ChatProvider>
                <ChatContainer 
                    locationId={lid} 
                    memberId={memberData.member_id}
                    availableBots={activeBots || []}
                />
            </ChatProvider>
        </div>
    );
}
```

### **7.2 Member Chat API Endpoints**

#### **Member Chat Route**
```typescript
// /monstro-member/src/app/api/chat/[lid]/route.ts
import { createClient } from '@/libs/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getModel } from '@/libs/server/ai/models';
import { getRedisClient } from '@/libs/server/redis';
import { streamChat } from '@/libs/server/ai/streaming';
import { updateTicketStatus } from '@/libs/server/ai/tools';

export async function POST(req: NextRequest, props: { params: Promise<{ lid: string }> }) {
    const { lid } = await props.params;
    const { messages, botId } = await req.json();
    const supabase = await createClient();
    
    // Validate JWT and get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get member information using Supabase RLS
    const { data: memberData, error: memberError } = await supabase
        .from('member_locations')
        .select(`
            member_id,
            members!inner(
                id,
                first_name,
                last_name,
                email,
                phone
            )
        `)
        .eq('location_id', lid)
        .eq('members.user_id', user.id)
        .single();
    
    if (memberError || !memberData) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    
    // Get bot configuration using Supabase RLS
    const { data: bot, error: botError } = await supabase
        .from('bots')
        .select(`
            id,
            name,
            prompt,
            model,
            temperature,
            initial_message,
            objectives,
            bot_scenarios!left(*),
            bot_knowledge!left(
                documents!inner(*)
            )
        `)
        .eq('id', botId)
        .eq('location_id', lid)
        .eq('status', 'Active')
        .single();
    
    if (botError || !bot) {
        return NextResponse.json({ error: 'Bot not found or inactive' }, { status: 404 });
    }
    
    // Initialize Redis session with smart recovery
    const redis = getRedisClient();
    const sessionId = `member-${memberData.members.id}-${botId}`;
    const TTL = 60 * 60 * 2; // 2 hours
    
    // Get or create conversation in database
    const { data: conversation } = await supabase
        .from('conversations')
        .select('id, metadata')
        .eq('location_id', lid)
        .eq('member_id', memberData.members.id)
        .single();

    let conversationId = conversation?.id;
    let isNewConversation = false;

    if (!conversationId) {
        const { data: newConversation } = await supabase
            .from('conversations')
            .insert({
                location_id: lid,
                member_id: memberData.members.id,
                metadata: { bot_id: botId, created_at: new Date().toISOString() }
            })
            .select('id')
            .single();

        conversationId = newConversation?.id;
        isNewConversation = true;
    }

    // Create ticket for new conversations
    if (isNewConversation && conversationId) {
        await supabase
            .from('tickets')
            .insert({
                conversation_id: conversationId,
                status: 'open',
                metadata: {
                    bot_id: botId,
                    member_id: memberData.members.id,
                    created_via: 'member_chat'
                }
            });
    }
    
    // Get or create Redis session with smart recovery
    let session = await redis.json.get(`session:${sessionId}`) as ChatSession | null;
    
    if (!session) {
        // Smart recovery: recreate session from conversation history
        session = await createOrRecoverSession({
            sessionId,
            botId,
            conversationId,
            memberContext,
            bot,
            supabase
        });
        
        await redis.json.set(`session:${sessionId}`, '$', session);
        await redis.expire(`session:${sessionId}`, TTL);
    } else {
        // Extend TTL on activity
        await redis.expire(`session:${sessionId}`, TTL);
    }
    
    // Save user message
    await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            content: messages[messages.length - 1].content,
            role: 'user',
            channel: 'WebChat'
        });
    
    // Process bot response
    const model = getModel(bot.model);
    const memberContext = {
        id: memberData.members.id,
        firstName: memberData.members.first_name,
        lastName: memberData.members.last_name,
        email: memberData.members.email,
        phone: memberData.members.phone,
        type: 'member'
    };

    // Generate streaming response with session state and ticket tools
    return streamChat({
        bot,
        messages,
        session,
        memberContext,
        conversationId,
        ticketId: ticket?.id,
        supabase,
        redis,
        tools: [updateTicketStatus]
    });
}
```

#### **Available Bots API**
```typescript
// /monstro-member/src/app/api/bots/[lid]/route.ts
import { createClient } from '@/libs/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, props: { params: Promise<{ lid: string }> }) {
    const { lid } = await props.params;
    const supabase = await createClient();
    
    // Validate JWT and get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify member has access to this location using Supabase RLS
    const { data: memberAccess, error: accessError } = await supabase
        .from('member_locations')
        .select('member_id')
        .eq('location_id', lid)
        .eq('members.user_id', user.id)
        .single();
    
    if (accessError || !memberAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Fetch active bots for this location using Supabase RLS
    const { data: bots, error: botsError } = await supabase
        .from('bots')
        .select(`
            id,
            name,
            initial_message,
            bot_personas!left(
                ai_persona!inner(
                    id,
                    name,
                    image,
                    response_details,
                    personality
                )
            )
        `)
        .eq('location_id', lid)
        .eq('status', 'Active');
    
    if (botsError) {
        return NextResponse.json({ error: 'Failed to fetch bots' }, { status: 500 });
    }
    
    return NextResponse.json(bots || []);
}
```

### **7.3 Member App Dependencies**

The member app needs its own bot processing libraries:

#### **Update monstro-member package.json**
```json
{
  "dependencies": {
    // Existing member app dependencies...
    
    // AI/LangChain Dependencies for member chat
    "@langchain/anthropic": "^0.3.21",
    "@langchain/openai": "^4.3.9",
    "@langchain/google-genai": "^0.2.10",
    "ai": "^4.3.9",
    
    // Redis for member chat sessions
    "@upstash/redis": "^1.34.4",
    
    // Existing Supabase (already present)
    "@supabase/supabase-js": "^2.x.x"
  }
}
```

#### **Member App Environment Variables**
```env
# /monstro-member/.env.local

# AI Models (for member chat)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_AI_API_KEY=your_google_key

# Redis for member chat sessions
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Supabase configuration (already exists)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
```

### **7.4 Member App Server Utilities**

#### **AI Models for Member App**
```typescript
// /monstro-member/src/libs/server/ai/models.ts
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export function getModel(model: "anthropic" | "gpt" | "gemini") {
    switch (model) {
        case "anthropic":
            return new ChatAnthropic({
                modelName: "claude-3-sonnet-20240229",
                apiKey: process.env.ANTHROPIC_API_KEY
            });
        case "gpt":
            return new ChatOpenAI({
                modelName: "gpt-4",
                apiKey: process.env.OPENAI_API_KEY
            });
        case "gemini":
            return new ChatGoogleGenerativeAI({
                modelName: "gemini-pro",
                apiKey: process.env.GOOGLE_AI_API_KEY
            });
    }
}
```

#### **Redis Configuration for Member App**
```typescript
// /monstro-member/src/libs/server/redis.ts
import { Redis } from "@upstash/redis";

export function getRedisClient() {
    return new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
}
```

#### **Session Types**
```typescript
// /monstro-member/src/types/chat.ts
export type ChatSession = {
    id: string;
    botId: string;
    conversationId: string;
    currentObjective: string | null;
    routineId: string | null;
    routineObjective: string | null;
    lastActivity: string;
    conversationState: 'new' | 'ongoing' | 'booking' | 'information_gathering';
    collectedData: Record<string, any>;
    metadata: {
        memberContext: any;
        bot: any;
    };
};

export type ConversationContext = {
    sessionId: string;
    botId: string;
    conversationId: string;
    memberContext: any;
    bot: any;
    supabase: any;
};

export type TicketStatus = 'open' | 'resolved';

export type Ticket = {
    id: string;
    conversationId: string;
    status: TicketStatus;
    created: Date;
    updated: Date | null;
    metadata?: Record<string, any>;
};
```

#### **Smart Session Recovery**
```typescript
// /monstro-member/src/libs/server/ai/session.ts
import { ChatSession, ConversationContext } from '@/types/chat';

export async function createOrRecoverSession({
    sessionId,
    botId,
    conversationId,
    memberContext,
    bot,
    supabase
}: ConversationContext): Promise<ChatSession> {
    
    // Get recent conversation history for context analysis
    const { data: recentMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(20);
    
    if (!recentMessages || recentMessages.length === 0) {
        // New conversation - create fresh session
        return createFreshSession(sessionId, botId, conversationId, memberContext, bot);
    }
    
    // Smart recovery based on conversation analysis
    const conversationState = analyzeConversationState(recentMessages, bot);
    const collectedData = extractCollectedData(recentMessages);
    const currentObjective = determineCurrentObjective(recentMessages, bot);
    
    return {
        id: sessionId,
        botId,
        conversationId,
        currentObjective,
        routineId: null,
        routineObjective: null,
        lastActivity: new Date().toISOString(),
        conversationState,
        collectedData,
        metadata: { memberContext, bot }
    };
}

function createFreshSession(
    sessionId: string, 
    botId: string, 
    conversationId: string, 
    memberContext: any, 
    bot: any
): ChatSession {
    return {
        id: sessionId,
        botId,
        conversationId,
        currentObjective: bot.objectives?.[0]?.id || null,
        routineId: null,
        routineObjective: null,
        lastActivity: new Date().toISOString(),
        conversationState: 'new',
        collectedData: {},
        metadata: { memberContext, bot }
    };
}

function analyzeConversationState(messages: any[], bot: any): ChatSession['conversationState'] {
    const lastBotMessage = messages.find(m => m.role === 'ai')?.content?.toLowerCase() || '';
    
    // Analyze recent conversation to determine state
    if (lastBotMessage.includes('appointment') || lastBotMessage.includes('booking')) {
        return 'booking';
    }
    
    if (lastBotMessage.includes('tell me more') || lastBotMessage.includes('information')) {
        return 'information_gathering';
    }
    
    if (messages.length > 4) {
        return 'ongoing';
    }
    
    return 'new';
}

function extractCollectedData(messages: any[]): Record<string, any> {
    const collectedData: Record<string, any> = {};
    
    // Extract structured data from conversation
    // This would be more sophisticated in real implementation
    messages.forEach(msg => {
        if (msg.role === 'user') {
            // Extract email, phone, name patterns
            const emailMatch = msg.content.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
            if (emailMatch) collectedData.email = emailMatch[0];
            
            const phoneMatch = msg.content.match(/\b\d{3}-\d{3}-\d{4}\b/);
            if (phoneMatch) collectedData.phone = phoneMatch[0];
        }
    });
    
    return collectedData;
}

function determineCurrentObjective(messages: any[], bot: any): string | null {
    if (!bot.objectives || bot.objectives.length === 0) {
        return null;
    }
    
    const lastBotMessage = messages.find(m => m.role === 'ai')?.content?.toLowerCase() || '';
    
    // Match bot message patterns to objectives
    for (const objective of bot.objectives) {
        if (objective.trigger && lastBotMessage.includes(objective.trigger.toLowerCase())) {
            return objective.id;
        }
    }
    
    // Default to first objective
    return bot.objectives[0]?.id || null;
}
```

#### **Ticket Management Tools**
```typescript
// /monstro-member/src/libs/server/ai/tools.ts
import { tool } from "@langchain/core/tools";

export const updateTicketStatus = tool(async ({ ticketId, status, reason }) => {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('tickets')
        .update({
            status,
            updated_at: new Date().toISOString(),
            metadata: {
                updated_reason: reason,
                updated_by: 'bot'
            }
        })
        .eq('id', ticketId)
        .select()
        .single();

    if (error) {
        return `Failed to update ticket: ${error.message}`;
    }

    return `Ticket ${ticketId} status updated to ${status}`;
}, {
    name: "update_ticket_status",
    description: "Update the status of a support ticket",
    schema: {
        type: "object",
        properties: {
            ticketId: { type: "string", description: "The ticket ID to update" },
            status: { type: "string", enum: ["open", "resolved"], description: "New status for the ticket" },
            reason: { type: "string", description: "Reason for the status change" }
        },
        required: ["ticketId", "status"]
    }
});
```

#### **Chat Streaming with Session Management**
```typescript
// /monstro-member/src/libs/server/ai/streaming.ts
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { ChatSession } from '@/types/chat';

export async function streamChat({
    bot,
    messages,
    session,
    memberContext,
    conversationId,
    ticketId,
    supabase,
    redis,
    tools = []
}: {
    bot: any;
    messages: any[];
    session: ChatSession;
    memberContext: any;
    conversationId: string;
    ticketId?: string;
    supabase: any;
    redis: any;
    tools?: any[];
}) {
    const model = getModel(bot.model);
    
    // Build conversation context with session state
    const chatMessages = messages.map(msg => 
        msg.role === 'user' 
            ? new HumanMessage(msg.content)
            : new AIMessage(msg.content)
    );
    
    // Get ticket information for context
    const { data: ticket } = await supabase
        .from('tickets')
        .select('*')
        .eq('conversation_id', conversationId)
        .single();

    // Enhanced system prompt with session and ticket context
    const systemPrompt = `You are ${bot.name || 'a helpful assistant'}.

${bot.prompt}

Member Context:
- Name: ${memberContext.firstName} ${memberContext.lastName}
- Email: ${memberContext.email}
- Member ID: ${memberContext.id}

Session Context:
- Conversation State: ${session.conversationState}
- Current Objective: ${session.currentObjective || 'general_assistance'}
- Collected Data: ${JSON.stringify(session.collectedData)}

Ticket Context:
- Ticket Status: ${ticket?.status || 'none'}
- Ticket ID: ${ticket?.id || 'none'}
- Last Updated: ${ticket?.updated_at || 'never'}

${session.conversationState === 'booking' ? 'Focus on helping complete the booking process.' : ''}
${session.conversationState === 'information_gathering' ? 'Continue gathering relevant information.' : ''}

${ticket?.status === 'open' && !isNewConversation ? 'Check if the member\'s issue has been resolved and offer to update ticket status if appropriate.' : ''}

Be helpful and personalize responses appropriately. Use the session and ticket context to provide continuity. You can update ticket status by calling the appropriate tool when the member indicates their issue is resolved.`;
    
    // Stream response with session updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                const modelWithTools = model.bindTools(tools);
                const response = await modelWithTools.stream([
                    new HumanMessage(systemPrompt),
                    ...chatMessages
                ]);
                
                let fullResponse = '';
                
                for await (const chunk of response) {
                    const content = chunk.content;
                    fullResponse += content;
                    
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
                
                // Update session with new response context
                session.lastActivity = new Date().toISOString();
                session.conversationState = analyzeNewResponseState(fullResponse, session.conversationState);
                
                // Extract any new data from the conversation
                const userMessage = messages[messages.length - 1]?.content || '';
                const newData = extractDataFromMessage(userMessage);
                session.collectedData = { ...session.collectedData, ...newData };
                
                // Save updated session to Redis
                await redis.json.set(`session:${session.id}`, '$', session);
                await redis.expire(`session:${session.id}`, 60 * 60 * 2); // Reset TTL
                
                // Save bot response to database (permanent storage)
                await supabase
                    .from('messages')
                    .insert({
                        conversation_id: conversationId,
                        content: fullResponse,
                        role: 'ai',
                        channel: 'WebChat',
                        metadata: {
                            session_state: session.conversationState,
                            collected_data: session.collectedData
                        }
                    });
                
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
            } catch (error) {
                console.error('Streaming error:', error);
                controller.error(error);
            }
        }
    });
    
    function analyzeNewResponseState(botResponse: string, currentState: string): ChatSession['conversationState'] {
        const response = botResponse.toLowerCase();
        
        if (response.includes('book') || response.includes('appointment') || response.includes('schedule')) {
            return 'booking';
        }
        
        if (response.includes('tell me more') || response.includes('need more information')) {
            return 'information_gathering';
        }
        
        return currentState === 'new' ? 'ongoing' : currentState;
    }
    
    function extractDataFromMessage(message: string): Record<string, any> {
        const data: Record<string, any> = {};
        
        // Extract structured information
        const emailMatch = message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
        if (emailMatch) data.email = emailMatch[0];
        
        const phoneMatch = message.match(/\b\d{3}-?\d{3}-?\d{4}\b/);
        if (phoneMatch) data.phone = phoneMatch[0];
        
        // Extract time preferences
        const timeMatch = message.match(/\b\d{1,2}:\d{2}\s?(AM|PM|am|pm)?\b/);
        if (timeMatch) data.preferredTime = timeMatch[0];
        
        return data;
    }
    
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}
```

### **7.5 Member Chat Components**

#### **Chat Container**
```typescript
// /monstro-member/src/app/[lid]/chat/components/ChatContainer.tsx
'use client'
import { useState } from 'react';
import { ChatMessages, ChatInput, BotSelector } from './';
import { useChatContext } from './ChatProvider';

interface ChatContainerProps {
    locationId: string;
    memberId: string;
    availableBots: Bot[];
}

export function ChatContainer({ locationId, memberId, availableBots }: ChatContainerProps) {
    const { selectedBot, setSelectedBot, messages } = useChatContext();
    
    return (
        <div className="flex flex-col h-full max-w-2xl mx-auto">
            <BotSelector 
                bots={availableBots} 
                selectedBot={selectedBot}
                onBotSelect={setSelectedBot}
            />
            
            <ChatMessages messages={messages} />
            
            {selectedBot && (
                <ChatInput 
                    locationId={locationId}
                    botId={selectedBot.id}
                />
            )}
        </div>
    );
}
```

#### **Simple Chat Input**
```typescript
// /monstro-member/src/app/[lid]/chat/components/ChatInput.tsx
'use client'
import { useState } from 'react';
import { useChatContext } from './ChatProvider';

interface ChatInputProps {
    locationId: string;
    botId: string;
}

export function ChatInput({ locationId, botId }: ChatInputProps) {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { addMessage } = useChatContext();
    
    async function sendMessage(e: React.FormEvent) {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        
        const userMessage = { role: 'user', content: input };
        addMessage(userMessage);
        setInput('');
        setIsLoading(true);
        
        try {
            const response = await fetch(`/api/chat/${locationId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    botId
                })
            });
            
            // Handle streaming response
            const reader = response.body?.getReader();
            if (reader) {
                const botMessage = { role: 'assistant', content: '' };
                addMessage(botMessage);
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = new TextDecoder().decode(value);
                    // Update bot message content
                    updateLastMessage(chunk);
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
        } finally {
            setIsLoading(false);
        }
    }
    
    return (
        <form onSubmit={sendMessage} className="p-4 border-t">
            <div className="flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 p-2 border rounded"
                    disabled={isLoading}
                />
                <button 
                    type="submit" 
                    disabled={isLoading || !input.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
                >
                    Send
                </button>
            </div>
        </form>
    );
}
```

### **7.6 Architecture Summary**

This hybrid architecture ensures optimal performance with proper concern separation:

#### **Monstro-15 (Admin Portal)**
- **Purpose**: Bot management and admin testing
- **Chat Endpoint**: `/api/protected/loc/[id]/bots/[bid]/chat` - For admin testing only
- **Database Access**: Direct Drizzle ORM queries
- **Session Management**: Full Redis with complex flow state
- **User Context**: Admin/staff users

#### **Monstro-Member (Member App)**  
- **Purpose**: Member chat interactions
- **Chat Endpoint**: `/api/chat/[lid]` - For member interactions
- **Database Access**: Supabase client with RLS
- **Session Management**: Hybrid approach (Redis + Smart Recovery)
- **User Context**: Authenticated members

#### **Hybrid Storage Strategy**
- **Redis Sessions**: Active conversation state, collected data, objectives (2-hour TTL)
- **Database Storage**: Permanent conversation history, messages, member data
- **Smart Recovery**: Recreates sessions from database when expired
- **Session Continuity**: Seamless conversation flow even after long breaks

Both apps share the same database but access it through their respective authentication patterns, with the member app using intelligent session management for superior user experience.

---

## 🚦 **Migration Execution Timeline**

### **Database & Dependencies**
- [ ] Create database migration scripts
- [ ] Run migrations on development database
- [ ] Update package.json dependencies
- [ ] Set up environment variables (Redis for queues, AI keys)
- [ ] Test database connections

### **Queue System Setup**
- [ ] Set up Redis/IORedis for BullMQ queues
- [ ] Implement node flow processing worker
- [ ] Test queue job processing
- [ ] Set up queue monitoring

### **Backend APIs**
- [ ] Create core bot API routes
- [ ] Implement queue-based chat processing
- [ ] Create scenario management APIs
- [ ] Create knowledge base APIs
- [ ] Test all endpoints with node flow execution

### **Server Utilities & Types**
- [ ] Copy and adapt AI server libraries
- [ ] Create contact helper functions
- [ ] Set up Redis configuration
- [ ] Create all TypeScript types
- [ ] Test utility functions

### **Frontend Migration**
- [ ] Remove old AI directory
- [ ] Create new bots directory structure
- [ ] Copy and adapt all React components
- [ ] Update navigation links
- [ ] Test component rendering

### **Member App Integration (Hybrid Approach)**
- [ ] Add AI dependencies to monstro-member package.json (LangChain + Redis)
- [ ] Set up member app environment variables (AI keys, Redis URL/Token)
- [ ] Create AI server utilities for member app (models, streaming, redis)
- [ ] Implement session types and smart recovery functions
- [ ] Implement member chat API routes with Redis session management
- [ ] Create chat interface in member app with session continuity
- [ ] Create bot selector component
- [ ] Test session creation and recovery after expiration
- [ ] Test member-to-bot communication with conversation state
- [ ] Test real-time streaming with session updates
- [ ] Verify proper data isolation between admin and member contexts
- [ ] Test automatic ticket creation for member chat sessions
- [ ] Test natural issue resolution checking in member conversations
- [ ] Test bot tool calls for ticket status updates in member app
- [ ] Test hybrid storage (Redis sessions + Database persistence)

### **Integration & Testing**
- [ ] Test complete bot creation flow (admin portal)
- [ ] Test scenario management (admin portal)
- [ ] Test admin chat functionality with both member/guest contacts
- [ ] Test knowledge base management
- [ ] Test member-to-guest promotion flow
- [ ] Test member app chat functionality independently
- [ ] Test ticket creation and status updates in member chat
- [ ] Test automatic ticket creation on new sessions
- [ ] Test natural conversation flow for issue resolution checking
- [ ] Test bot tool calls for ticket status updates
- [ ] Test ticket status persistence across sessions
- [ ] Verify both apps work independently with shared database
- [ ] Test data consistency between admin and member contexts

### **Production Deployment**
- [ ] Run production database migrations
- [ ] Deploy updated application (monstro-15)
- [ ] Deploy member app updates (monstro-member)
- [ ] Monitor for issues
- [ ] Update documentation

---

## 🔍 **Critical Testing Checklist**

### **Database Integration**
- [ ] Members can chat with bots (memberLocations integration)
- [ ] Guests can chat with bots (guestContacts table)
- [ ] Guest-to-member promotion works correctly
- [ ] Bot metadata is properly stored and retrieved
- [ ] All foreign key constraints work correctly
- [ ] Database migrations run without errors

### **Bot Functionality**
- [ ] Bot creation and configuration works
- [ ] Scenario triggers work correctly with test messages
- [ ] Knowledge base queries return relevant information
- [ ] Chat testing interface responds properly
- [ ] Different AI models (GPT, Claude, Gemini) respond correctly
- [ ] Node flow execution follows designed paths
- [ ] Bot templates can be applied to new bots

### **Contact Handling**
- [ ] Contact selection in chat testing works
- [ ] Member vs guest conversation tracking is accurate
- [ ] Bot progress tracking works for both member and guest types
- [ ] Conversation history is preserved correctly
- [ ] Unified contact API returns both members and guests
- [ ] Guest promotion to member preserves conversation history

### **API Endpoints**
- [ ] All CRUD operations for bots function properly
- [ ] Scenario management (create/update/delete) works
- [ ] Document upload and processing completes successfully
- [ ] Chat streaming responses work without dropping connections
- [ ] Hybrid contact endpoints return correct data
- [ ] Error handling works for invalid requests
- [ ] Authentication and authorization work correctly

### **Frontend Components**
- [ ] Bot list displays and updates correctly
- [ ] Bot configuration panel saves changes
- [ ] Chat testing interface sends and receives messages
- [ ] Navigation links work and highlight correctly
- [ ] All forms validate input properly
- [ ] Loading states display appropriately
- [ ] Error messages are user-friendly

### **Integration Points**
- [ ] Redis sessions are created and maintained
- [ ] LangChain integration works with all AI providers
- [ ] Vector embeddings are generated for documents
- [ ] Workflow execution triggers correctly
- [ ] Tool calls (booking, extraction, etc.) function properly
- [ ] File uploads complete and are processed
- [ ] Real-time streaming maintains connection stability

### **Performance & Scalability**
- [ ] Database queries perform efficiently
- [ ] Chat responses stream without significant delay
- [ ] File processing doesn't block the UI
- [ ] Memory usage remains stable during extended sessions
- [ ] Concurrent bot conversations don't interfere
- [ ] Large knowledge bases don't slow down responses

### **Security & Data Privacy**
- [ ] User data is properly isolated by location
- [ ] Bot conversations are not accessible across locations
- [ ] File uploads are validated and sanitized
- [ ] API endpoints require proper authentication
- [ ] Guest contact data is handled securely
- [ ] Member data integration maintains existing privacy controls

### **Member App Integration**
- [ ] Members can access chat interface from member app
- [ ] Only active bots are available for member selection
- [ ] Supabase authentication works for member chat access
- [ ] Chat messages stream in real-time to member app
- [ ] Member context is properly passed to bot conversations
- [ ] Conversation history is preserved for members in database
- [ ] Bot responses are personalized for member data
- [ ] AI processing works independently in member app
- [ ] Error handling works gracefully in member app
- [ ] Mobile responsiveness works for member chat
- [ ] Bot selector shows available bots correctly
- [ ] Member app can handle multiple concurrent conversations
- [ ] Supabase RLS policies protect member data access
- [ ] Member app AI models function correctly
- [ ] Member chat is completely independent from admin chat testing
- [ ] Both apps can operate independently with same database

### **Ticket System**
- [ ] Tickets are automatically created for new chat sessions
- [ ] Ticket creation works for both member and guest conversations
- [ ] Ticket status is properly tracked and updated
- [ ] Bot can access ticket information during conversations
- [ ] Ticket status updates work through API tool calls
- [ ] Natural conversation flow includes issue resolution checking
- [ ] Ticket metadata includes relevant conversation context
- [ ] Ticket relationships are properly maintained with conversations
- [ ] Ticket status changes are logged with timestamps
- [ ] Ticket system works independently in member app

### **Redis Session Management**
- [ ] Redis sessions are created correctly for new conversations
- [ ] Session TTL is set and managed properly (2 hours)
- [ ] Session data includes conversation state and collected data
- [ ] Sessions extend TTL on user activity
- [ ] Smart recovery recreates sessions from conversation history
- [ ] Conversation state analysis works correctly (new/ongoing/booking/information_gathering)
- [ ] Data extraction from messages functions properly (email, phone, time)
- [ ] Current objective determination works based on bot configuration
- [ ] Session updates are saved to Redis after each interaction
- [ ] Expired sessions trigger smart recovery instead of fresh start
- [ ] Multiple concurrent sessions don't interfere with each other
- [ ] Session data is properly cleaned up after TTL expiration
- [ ] Session recovery handles edge cases (corrupted data, missing messages)
- [ ] Bot prompt includes session context for conversation continuity
- [ ] Session state transitions work correctly throughout conversation flow

---

## 📈 **Success Metrics**

✅ **Zero data loss** during migration  
✅ **Feature parity** with monstro-bots functionality  
✅ **Improved user experience** with member integration  
✅ **Clean upgrade path** for guest contacts to members
✅ **Scalable architecture** for future bot features
✅ **Maintainable codebase** with proper separation of concerns
✅ **Automatic ticket creation** for issue tracking
✅ **Natural conversation flow** for issue resolution checking
✅ **Tool-based ticket status updates** during conversations  
✅ **Comprehensive testing** covering all use cases  

---

## 📚 **Additional Notes**

### **Node System Architecture**
The bot system uses a visual node-based flow where each node represents a step in the conversation:

- **Standard Nodes**: Basic conversational responses
- **Extraction Nodes**: Extract specific information from user messages
- **Condition Nodes**: Create branching logic based on conditions  
- **Delay Nodes**: Add timed delays between responses
- **Booking Nodes**: Handle appointment scheduling flows

Each node contains:
- **Label**: Display name
- **Goal**: What the AI should accomplish
- **Instructions**: Specific guidance
- **Functions**: Tools/actions the AI can use
- **Paths**: Where to go next (branching logic)

### **Hybrid Contact Benefits**
- **No data duplication** between members and contacts
- **Leverages existing member data** for authenticated users  
- **Handles non-member interactions** with lightweight guest table
- **Clean upgrade path** when guests become members
- **Single source of truth** for member information
- **Maintains all business relationships** (billing, memberships, etc.)

### **Migration Risk Mitigation**
- **Incremental deployment** with feature flags
- **Rollback plan** if issues are discovered
- **Data backup** before running migrations
- **Staging environment** testing before production
- **Monitoring and alerting** for post-migration issues

### **Ticket System Architecture**
The ticket system provides automatic issue tracking for bot conversations:

- **Automatic Creation**: Every new chat session creates a ticket with "open" status
- **Status Tracking**: Tickets can be "open" or "resolved" with proper metadata
- **Natural Integration**: Bot can naturally ask about issue resolution in conversation
- **Tool-Based Updates**: Bot can call API tools to update ticket status when appropriate
- **Session Continuity**: Ticket context is maintained across session recovery
- **Member/Guest Support**: Works for both authenticated members and guest contacts

### **Ticket Conversation Flow**
1. **New Session**: Ticket automatically created with "open" status
2. **Ongoing Conversation**: Bot provides assistance and tracks progress
3. **Resolution Checking**: Bot naturally asks if issue is resolved
4. **Status Updates**: Bot calls tools to update ticket status based on member responses
5. **Session Recovery**: Ticket context restored when member returns
6. **Closure**: Ticket marked as resolved when appropriate

This comprehensive plan ensures a smooth migration while leveraging your existing Members system and providing a clear path for both authenticated and guest bot interactions.
