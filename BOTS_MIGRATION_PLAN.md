# 🤖 Support Bot Migration Plan: Simplified Single Bot Approach

## 📋 **Migration Overview**

**Goal**: Create a simplified support chatbot system for `monstro-15` that provides Q&A assistance to members with vendor takeover capability, replacing the complex multi-bot workflow system.

**Target**: Replace `/src/app/dashboard/location/[id]/ai/` in monstro-15 with a single support bot per location that can handle basic support queries and ticket management.

**Key Changes**: 
- Single bot per location (no multiple bot creation/deletion)
- No visual node workflow builder
- Simple Q&A chatbot with fixed tool calls  
- User-defined "Triggers" (previously "Scenarios") for hard tool call triggers
- Bot-inferred tool calls still available
- Vendor takeover functionality for human intervention
- Integrated ticket management system

---

## 🗄️ **Phase 1: Database Schema Migration**

### **1.1 Create Support Bot Enums**
Create `/src/db/schemas/SupportBotEnums.ts`:
```sql
-- Simplified enums for support bot functionality
CREATE TYPE bot_status AS ENUM ('Draft', 'Active', 'Paused');
CREATE TYPE channel AS ENUM ('WebChat', 'Email', 'System');
CREATE TYPE message_role AS ENUM ('user', 'ai', 'vendor', 'system', 'tool', 'tool_response');
CREATE TYPE bot_model AS ENUM ('anthropic', 'gpt', 'gemini');
CREATE TYPE document_type AS ENUM ('file', 'website');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE trigger_type AS ENUM ('keyword', 'intent', 'condition');

### **1.2 Create TypeScript Enums**
Create `/src/db/schemas/SupportBotEnums.ts` with TypeScript enums:
```typescript
import { pgEnum } from "drizzle-orm/pg-core";

export enum BotStatus {
    Draft = 'Draft',
    Active = 'Active',
    Paused = 'Paused'
}

export enum Channel {
    WebChat = 'WebChat',
    Email = 'Email',
    System = 'System'
}

export enum MessageRole {
    User = 'user',
    AI = 'ai',
    Vendor = 'vendor',
    System = 'system',
    Tool = 'tool',
    ToolResponse = 'tool_response'
}

export enum BotModel {
    Anthropic = 'anthropic',
    GPT = 'gpt',
    Gemini = 'gemini'
}

export enum DocumentType {
    File = 'file',
    Website = 'website'
}

export enum TicketStatus {
    Open = 'open',
    InProgress = 'in_progress',
    Resolved = 'resolved',
    Closed = 'closed'
}

export enum TriggerType {
    Keyword = 'keyword',
    Intent = 'intent',
    Condition = 'condition'
}

export const ticketStatusEnum = pgEnum("ticket_status", [
    TicketStatus.Open,
    TicketStatus.InProgress,
    TicketStatus.Resolved,
    TicketStatus.Closed,
]);

export const triggerTypeEnum = pgEnum("trigger_type", [
    TriggerType.Keyword,
    TriggerType.Intent,
    TriggerType.Condition,
]);
```

### **1.3 Extend Existing Members System**
```sql
-- Add support bot specific fields to existing memberLocations table
ALTER TABLE member_locations ADD COLUMN support_bot_metadata JSONB DEFAULT '{}';
ALTER TABLE member_locations ADD COLUMN last_support_interaction TIMESTAMPTZ;
```

### **1.4 Create Guest Contacts Table (For Non-Members)**
```sql
-- Lightweight table for non-authenticated support interactions
CREATE TABLE guest_contacts (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    support_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(location_id, email)
);
```

### **1.5 Create Support Bot Tables**
```sql
-- Single support bot per location
CREATE TABLE support_bots (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Support Bot',
    prompt TEXT NOT NULL DEFAULT 'You are a helpful customer support assistant.',
    temperature INTEGER NOT NULL DEFAULT 0,
    initial_message TEXT NOT NULL DEFAULT 'Hi! I'm here to help you. What can I assist you with today?',
    model bot_model NOT NULL DEFAULT 'gpt',
    status bot_status NOT NULL DEFAULT 'Draft',
    available_tools JSONB[] NOT NULL DEFAULT '{}', -- Fixed set of tool definitions
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    UNIQUE(location_id) -- Only one support bot per location
);

-- Support bot triggers (previously scenarios)
CREATE TABLE support_triggers (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    support_bot_id TEXT NOT NULL REFERENCES support_bots(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type trigger_type NOT NULL DEFAULT 'keyword',
    trigger_phrases TEXT[] NOT NULL DEFAULT '{}',
    tool_call JSONB NOT NULL, -- Specific tool call to execute
    examples TEXT[] NOT NULL DEFAULT '{}',
    requirements TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- AI persona for support bot (optional)
CREATE TABLE support_bot_personas (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    support_bot_id TEXT NOT NULL REFERENCES support_bots(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image TEXT,
    response_style TEXT NOT NULL DEFAULT '',
    personality_traits TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    UNIQUE(support_bot_id) -- One persona per support bot
);
```

### **1.6 Create Knowledge Base Tables**
```sql
-- Documents for support bot knowledge base
CREATE TABLE support_documents (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    support_bot_id TEXT NOT NULL REFERENCES support_bots(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_path TEXT,
    url TEXT,
    type document_type NOT NULL,
    size INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Document chunks for RAG
CREATE TABLE support_document_chunks (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    document_id TEXT REFERENCES support_documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(384)
);
```

### **1.7 Create Conversation Tables (Hybrid Member/Guest Support)**
```sql
-- Support conversations supporting both members and guests
CREATE TABLE support_conversations (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    support_bot_id TEXT NOT NULL REFERENCES support_bots(id) ON DELETE CASCADE,
    
    -- Either member_id OR guest_contact_id (not both)
    member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
    guest_contact_id TEXT REFERENCES guest_contacts(id) ON DELETE CASCADE,
    
    -- Vendor takeover functionality
    vendor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    taken_over_at TIMESTAMPTZ,
    is_vendor_active BOOLEAN DEFAULT FALSE,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    
    CONSTRAINT support_conversation_contact_check CHECK (
        (member_id IS NOT NULL AND guest_contact_id IS NULL) OR
        (member_id IS NULL AND guest_contact_id IS NOT NULL)
    )
);

-- Messages in support conversations
CREATE TABLE support_messages (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    conversation_id TEXT NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    role message_role NOT NULL,
    channel channel NOT NULL DEFAULT 'WebChat',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Support tickets for issue tracking
CREATE TABLE support_tickets (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    conversation_id TEXT NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Support Request',
    description TEXT,
    status ticket_status NOT NULL DEFAULT 'open',
    priority INTEGER DEFAULT 3, -- 1=high, 2=medium, 3=low
    assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

-- Support interaction logs
CREATE TABLE support_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_base62(),
    support_bot_id TEXT NOT NULL REFERENCES support_bots(id) ON DELETE CASCADE,
    conversation_id TEXT REFERENCES support_conversations(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'chat', 'tool_call', 'vendor_takeover', etc.
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### **1.8 Create Schema Files**
Create schema TypeScript files for the new tables:

#### `/src/db/schemas/supportTickets.ts`
```typescript
import { pgTable, text, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { supportConversations } from "./supportConversations";
import { users } from "./users";
import { ticketStatusEnum } from "./SupportBotEnums";

export const supportTickets = pgTable("support_tickets", {
    id: text("id").primaryKey().default("uuid_base62()"),
    conversationId: text("conversation_id").notNull().references(() => supportConversations.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Support Request"),
    description: text("description"),
    status: ticketStatusEnum("status").notNull().default("open"),
    priority: integer("priority").default(3),
    assignedTo: text("assigned_to").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
    metadata: jsonb("metadata").default("{}"),
});

export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
```

#### `/src/db/schemas/supportTriggers.ts`
```typescript
import { pgTable, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { supportBots } from "./supportBots";
import { triggerTypeEnum } from "./SupportBotEnums";

export const supportTriggers = pgTable("support_triggers", {
    id: text("id").primaryKey().default("uuid_base62()"),
    supportBotId: text("support_bot_id").notNull().references(() => supportBots.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    triggerType: triggerTypeEnum("trigger_type").notNull().default("keyword"),
    triggerPhrases: text("trigger_phrases").array().notNull().default("{}"),
    toolCall: jsonb("tool_call").notNull(),
    examples: text("examples").array().notNull().default("{}"),
    requirements: text("requirements").array().notNull().default("{}"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export type SupportTrigger = typeof supportTriggers.$inferSelect;
export type NewSupportTrigger = typeof supportTriggers.$inferInsert;
```

### **1.9 Update Schema Index**
Update `/src/db/schemas/index.ts`:
```typescript
// Existing exports
export * from "./users";
export * from "./locations";
export * from "./members";
// ... all existing exports

// NEW SUPPORT BOT SCHEMAS
export * from "./SupportBotEnums";
export * from "./supportBots";
export * from "./supportDocuments";
export * from "./supportConversations";
export * from "./supportMessages";
export * from "./supportTickets";
export * from "./supportTriggers";
export * from "./supportLogs";
export * from "./guestContacts";
```

---

## 📦 **Phase 2: Dependencies & Environment**

### **2.1 Update package.json in monstro-15**
```json
{
  "dependencies": {
    // Remove complex dependencies we don't need
    // ❌ "bullmq": "^5.53.3",         // Remove queue processing
    // ❌ "ioredis": "^5.4.1",         // Remove complex Redis
    // ❌ "@xyflow/react": "^12.8.4",  // Remove visual node builder
    // ❌ "ai": "^4.3.9",              // Remove (using LangChain instead)
    
    // AI Processing with LangChain (already installed)
    "@langchain/core": "^0.3.21",       // ✅ Core LangChain functionality
    "@langchain/anthropic": "^0.3.21",  // ✅ Claude support
    "@langchain/openai": "^4.3.9",      // ✅ OpenAI/GPT support
    "@langchain/google-genai": "^0.2.10", // ✅ Gemini support
    "langchain": "^0.3.6",              // ✅ Main LangChain package
    
    // Session Management (simplified)
    "@upstash/redis": "^1.34.4",        // ✅ Simple Redis sessions
    
    // Document Processing
    "pdf-parse": "^1.1.1",              // ✅ PDF knowledge base
    "@mendable/firecrawl-js": "^1.25.5", // ✅ Web scraping
    
    // Embeddings & Vector DB
    "@xenova/transformers": "^2.13.4",   // ✅ Local embeddings
    
    // UI Components (if missing)
    "@radix-ui/react-accordion": "^1.2.0",
    "@radix-ui/react-slider": "^1.3.5",
    "@radix-ui/react-toast": "^1.2.1"
  }
}
```

**Key Changes:**
- ❌ **Remove `ai` package** - Using LangChain for direct AI processing
- ❌ **Remove `bullmq`** - No complex queue processing needed
- ❌ **Remove `ioredis`** - No complex Redis operations needed  
- ❌ **Remove `@xyflow/react`** - No visual node builder
- ✅ **Keep existing LangChain setup** - Already handles streaming, tools, and multiple AI providers

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

# Vector DB & Embeddings (P0)
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

### **3.1 Create Support Bot API Routes**

#### `/src/app/api/protected/loc/[id]/support/route.ts`
```typescript
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    // Get the single support bot for this location
    // Auto-create if doesn't exist
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    // Update support bot configuration
}
```

#### `/src/app/api/protected/loc/[id]/support/status/route.ts`
```typescript
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    // Update support bot status (Draft/Active/Paused)
}
```

---

#### `/src/app/api/protected/loc/[id]/support/chat/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { getModel } from '@/libs/server/ai/models';
import { db } from '@/db/db';
import { getRedisClient } from '@/libs/server/redis';
import { buildSupportPrompt, buildSupportTools } from '@/libs/server/ai/support';

// Simple direct AI processing for support bot chat using LangChain
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;
    const { messages, sessionId, testContact } = await req.json();

    if (!messages?.length || !sessionId) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    try {
        // Get support bot configuration
        const supportBot = await db.query.supportBots.findFirst({
            where: (bots, { eq }) => eq(bots.locationId, id),
            with: {
                persona: true,
                documents: true,
                triggers: { where: (triggers, { eq }) => eq(triggers.isActive, true) }
            }
        });

        if (!supportBot) {
            return NextResponse.json({ error: "Support bot not found" }, { status: 404 });
        }

        // Direct AI processing with LangChain streaming
        const model = getModel(supportBot.model);
        const systemPrompt = buildSupportPrompt(supportBot, testContact);
        
        // Convert messages to LangChain format
        const chatMessages = [
            new HumanMessage(systemPrompt),
            ...messages.map((msg: any) => 
                msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
            )
        ];

        // Bind tools to model if available
        const tools = buildSupportTools(supportBot.availableTools);
        const modelWithTools = tools.length > 0 ? model.bindTools(tools) : model;

        // Stream response using LangChain
        const stream = await modelWithTools.stream(chatMessages, {
            temperature: supportBot.temperature / 100,
        });

        // Create streaming response
        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        const content = chunk.content;
                        if (content) {
                            const data = JSON.stringify({ content });
                            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                        }
                    }
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                } catch (error) {
                    console.error("Streaming error:", error);
                    controller.error(error);
                }
            }
        });

        return new Response(readableStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error("Support chat error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
```

### **3.2 Trigger Management APIs**

#### `/src/app/api/protected/loc/[id]/support/triggers/route.ts`
```typescript
export async function GET() { /* List support triggers */ }
export async function POST() { /* Create support trigger */ }
```

### **3.3 Knowledge Base APIs**

#### `/src/app/api/protected/loc/[id]/support/documents/route.ts`
```typescript
export async function GET() { /* List support documents */ }
export async function POST() { /* Upload & process document */ }
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
**Create**: `/src/app/dashboard/location/[id]/bots/` (but rename navigation to "Support")

```
/src/app/dashboard/location/[id]/bots/
├── layout.tsx
├── page.tsx                    # Main support bot dashboard
├── components/
│   ├── SupportBotConfig.tsx   # Bot configuration panel
│   ├── Chat/
│   │   ├── SupportChatBox.tsx # Main chat testing interface
│   │   ├── ChatProvider.tsx   # Simple chat state management
│   │   ├── ChatInput.tsx      # Message input
│   │   └── ChatMessages.tsx   # Message display
│   ├── Triggers/
│   │   ├── TriggerList.tsx    # List support triggers
│   │   ├── NewTrigger.tsx     # Create trigger dialog
│   │   └── TriggerForm.tsx    # Trigger configuration
│   ├── Documents/
│   │   ├── DocumentList.tsx   # Knowledge base documents
│   │   └── DocumentUpload.tsx # Document upload component
│   ├── Tickets/
│   │   ├── TicketList.tsx     # Support ticket list
│   │   └── TicketDetails.tsx  # Ticket detail view
│   └── schemas.ts             # Form validation schemas
└── hooks/
    └── useSupportBot.ts       # Support bot data fetching
```

### **4.2 Main Support Page**

#### `/src/app/dashboard/location/[id]/bots/page.tsx`
```typescript
import { db } from "@/db/db";
import { SupportBotConfig, SupportChatBox, ChatProvider } from "./components";

export default async function SupportPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    
    // Get or create support bot for location
    let supportBot = await db.query.supportBots.findFirst({
        where: (bots, { eq }) => eq(bots.locationId, params.id),
        with: {
            persona: true,
            triggers: true,
            documents: true
        }
    });

    // Auto-create support bot if doesn't exist
    if (!supportBot) {
        const [newBot] = await db.insert(supportBots).values({
            locationId: params.id,
            name: 'Support Bot',
            prompt: 'You are a helpful customer support assistant.',
            initialMessage: 'Hi! I\'m here to help you. What can I assist you with today?',
            model: 'gpt',
            status: 'Draft'
        }).returning();
        
        supportBot = { ...newBot, persona: null, triggers: [], documents: [] };
    }

    return (
        <div className='flex flex-row h-[calc(100vh-58px)] p-2 gap-2'>
            {/* Left Panel: Support Bot Configuration */}
            <div className="flex-1">
                <SupportBotConfig supportBot={supportBot} locationId={params.id} />
            </div>
            
            {/* Right Panel: Support Bot Testing Chat */}
            <div className="flex-1">
                <ChatProvider>
                    <SupportChatBox supportBot={supportBot} />
                </ChatProvider>
            </div>
        </div>
    )
}
```

---

## 🏗️ **Phase 5: Server Utilities Migration**

### **5.1 AI Server Libraries**

#### `/src/libs/server/ai/index.ts`
```typescript
export * from "./models";
export * from "./tools";
export * from "./prompts";
```

#### `/src/libs/server/ai/models.ts`
```typescript
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

export function getModel(model: "anthropic" | "gpt" | "gemini") {
    switch (model) {
        case "anthropic":
            return new ChatAnthropic({
                modelName: "claude-3-sonnet-20240229",
                apiKey: process.env.ANTHROPIC_API_KEY,
                streaming: true,
            });
        case "gpt":
            return new ChatOpenAI({
                modelName: "gpt-4",
                apiKey: process.env.OPENAI_API_KEY,
                streaming: true,
            });
        case "gemini":
            return new ChatGoogleGenerativeAI({
                modelName: "gemini-pro",
                apiKey: process.env.GOOGLE_AI_API_KEY,
                streaming: true,
            });
        default:
            return new ChatOpenAI({
                modelName: "gpt-4",
                apiKey: process.env.OPENAI_API_KEY,
                streaming: true,
            }); 
    }
}
```

### **5.2 Support Bot Helper Functions**

#### `/src/libs/server/support.ts`
```typescript
import { db } from '@/db/db';

// Get unified contact info for support conversations
export async function getContactInfo(conversation: SupportConversation) {
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
            supportMetadata: memberLocation.supportBotMetadata || {}
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
            supportMetadata: guest.supportMetadata || {}
        };
    }
}

// Build system prompt for support bot
export function buildSupportPrompt(supportBot: SupportBot, contact: any): string {
    const persona = supportBot.persona;
    
    return `${supportBot.prompt}

${persona ? `
Persona Details:
- Name: ${persona.name}
- Response Style: ${persona.responseStyle}
- Personality Traits: ${persona.personalityTraits.join(', ')}
` : ''}

Contact Context:
- Name: ${contact.firstName} ${contact.lastName}
- Type: ${contact.type}

Available Tools:
${supportBot.availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

Instructions:
- Be helpful and professional
- Use the persona's response style if available
- Use available tools when appropriate to help the customer
- Create support tickets for issues that need tracking
- Offer to escalate to human agent when needed`;
}

// Process trigger matching
export function evaluateTriggers(message: string, triggers: SupportTrigger[]): SupportTrigger | null {
    const messageLower = message.toLowerCase();
    
    for (const trigger of triggers) {
        if (!trigger.isActive) continue;
        
        for (const phrase of trigger.triggerPhrases) {
            if (messageLower.includes(phrase.toLowerCase())) {
                return trigger;
            }
        }
    }
    
    return null;
}
```

### **5.3 Simple Redis Configuration**

#### `/src/libs/server/redis.ts`
```typescript
import { Redis } from "@upstash/redis";

// Simple Redis for session management
export function getRedisClient() {
    return new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
}
```

### **5.4 Support Bot Tools**

#### `/src/libs/server/ai/tools.ts`
```typescript
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { db } from '@/db/db';
import { supportTickets, supportConversations } from '@/db/schemas/support';
import { eq, and } from 'drizzle-orm';

// Get member subscription/package status
export const getMemberStatus = tool(
    async ({ memberId }, context) => {
        const locationId = context?.locationId;
        
        // Get member's active subscriptions and packages
        const memberStatus = await db.query.memberLocations.findFirst({
            where: (ml, { eq, and }) => and(
                eq(ml.memberId, memberId),
                eq(ml.locationId, locationId)
            ),
            with: {
                member: {
                    with: {
                        memberSubscriptions: {
                            where: (ms, { eq }) => eq(ms.status, 'active'),
                            with: {
                                subscription: true,
                                plan: true
                            }
                        },
                        memberPackages: {
                            where: (mp, { gt }) => gt(mp.remainingCredits, 0),
                            with: {
                                package: true
                            }
                        }
                    }
                }
            }
        });

        if (!memberStatus) {
            return "I couldn't find your membership information. Please contact support for assistance.";
        }

        const subscriptions = memberStatus.member.memberSubscriptions;
        const packages = memberStatus.member.memberPackages;

        let response = "Here's your current membership status:\n\n";
        
        if (subscriptions.length > 0) {
            response += "**Active Subscriptions:**\n";
            subscriptions.forEach(sub => {
                response += `• ${sub.subscription.name} (${sub.plan.name}) - Status: ${sub.status}\n`;
                response += `  Next billing: ${sub.nextBillingDate || 'N/A'}\n`;
            });
        }

        if (packages.length > 0) {
            response += "\n**Available Packages:**\n";
            packages.forEach(pkg => {
                response += `• ${pkg.package.name} - ${pkg.remainingCredits} credits remaining\n`;
                response += `  Expires: ${pkg.expiresAt || 'No expiration'}\n`;
            });
        }

        if (subscriptions.length === 0 && packages.length === 0) {
            response += "You don't currently have any active subscriptions or packages.";
        }

        return response;
    },
    {
        name: "get_member_status",
        description: 'Get member subscription and package status information',
        schema: z.object({
            memberId: z.string().describe('The member ID to look up'),
        }),
    }
);

// Get member billing information
export const getMemberBilling = tool(
    async ({ memberId }, context) => {
        const locationId = context?.locationId;
        
        // Get member's billing info and recent transactions
        const billingInfo = await db.query.memberLocations.findFirst({
            where: (ml, { eq, and }) => and(
                eq(ml.memberId, memberId),
                eq(ml.locationId, locationId)
            ),
            with: {
                member: {
                    with: {
                        paymentMethods: {
                            where: (pm, { eq }) => eq(pm.isDefault, true)
                        },
                        transactions: {
                            orderBy: (t, { desc }) => desc(t.createdAt),
                            limit: 5,
                            with: {
                                invoice: true
                            }
                        }
                    }
                }
            }
        });

        if (!billingInfo) {
            return "I couldn't find your billing information. Please contact support for assistance.";
        }

        const member = billingInfo.member;
        let response = "Here's your billing information:\n\n";

        // Payment method info
        if (member.paymentMethods.length > 0) {
            const defaultMethod = member.paymentMethods[0];
            response += `**Default Payment Method:**\n`;
            response += `• ${defaultMethod.type} ending in ${defaultMethod.last4}\n`;
            response += `• Expires: ${defaultMethod.expiryMonth}/${defaultMethod.expiryYear}\n\n`;
        }

        // Recent transactions
        if (member.transactions.length > 0) {
            response += "**Recent Transactions:**\n";
            member.transactions.forEach(txn => {
                response += `• ${txn.createdAt.toLocaleDateString()} - $${txn.amount} (${txn.status})\n`;
                if (txn.invoice) {
                    response += `  Invoice: ${txn.invoice.number}\n`;
                }
            });
        }

        return response;
    },
    {
        name: "get_member_billing",
        description: 'Get member billing and payment information',
        schema: z.object({
            memberId: z.string().describe('The member ID to look up'),
        }),
    }
);

// Get member's bookable sessions/classes
export const getMemberBookableSessions = tool(
    async ({ memberId }, context) => {
        const locationId = context?.locationId;
        
        // Get member's available classes based on subscriptions and packages
        const memberAccess = await db.query.memberLocations.findFirst({
            where: (ml, { eq, and }) => and(
                eq(ml.memberId, memberId),
                eq(ml.locationId, locationId)
            ),
            with: {
                member: {
                    with: {
                        memberSubscriptions: {
                            where: (ms, { eq }) => eq(ms.status, 'active'),
                            with: {
                                subscription: {
                                    with: {
                                        subscriptionClasses: {
                                            with: {
                                                class: true
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        memberPackages: {
                            where: (mp, { gt }) => gt(mp.remainingCredits, 0),
                            with: {
                                package: {
                                    with: {
                                        packageClasses: {
                                            with: {
                                                class: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!memberAccess) {
            return "I couldn't find your membership information. Please contact support for assistance.";
        }

        const member = memberAccess.member;
        let availableClasses = new Set();
        let response = "Here are the classes you can book:\n\n";

        // Classes from active subscriptions
        member.memberSubscriptions.forEach(sub => {
            sub.subscription.subscriptionClasses.forEach(sc => {
                availableClasses.add(JSON.stringify({
                    name: sc.class.name,
                    description: sc.class.description,
                    duration: sc.class.duration,
                    source: 'subscription'
                }));
            });
        });

        // Classes from packages with credits
        member.memberPackages.forEach(pkg => {
            pkg.package.packageClasses.forEach(pc => {
                availableClasses.add(JSON.stringify({
                    name: pc.class.name,
                    description: pc.class.description,
                    duration: pc.class.duration,
                    source: 'package',
                    creditsRequired: pc.creditsRequired || 1
                }));
            });
        });

        if (availableClasses.size === 0) {
            return "You don't currently have access to any bookable classes. Consider purchasing a subscription or package to access our classes.";
        }

        const classesArray = Array.from(availableClasses).map(c => JSON.parse(c));
        
        // Group by source
        const subscriptionClasses = classesArray.filter(c => c.source === 'subscription');
        const packageClasses = classesArray.filter(c => c.source === 'package');

        if (subscriptionClasses.length > 0) {
            response += "**Included in your subscription:**\n";
            subscriptionClasses.forEach(cls => {
                response += `• ${cls.name} (${cls.duration} min)\n`;
                if (cls.description) response += `  ${cls.description}\n`;
            });
        }

        if (packageClasses.length > 0) {
            response += "\n**Available with your packages:**\n";
            packageClasses.forEach(cls => {
                response += `• ${cls.name} (${cls.duration} min) - ${cls.creditsRequired} credit(s)\n`;
                if (cls.description) response += `  ${cls.description}\n`;
            });
        }

        response += "\nTo book a session, please use our booking system or ask me to help you find available times!";

        return response;
    },
    {
        name: "get_member_bookable_sessions",
        description: 'Get classes and sessions the member can book based on their subscriptions and packages',
        schema: z.object({
            memberId: z.string().describe('The member ID to look up'),
        }),
    }
);

// Knowledge base search tool (for general questions)
export const searchKnowledge = tool(
    async ({ query }, context) => {
        const supportBotId = context?.supportBotId;
        
        // Simple text search in document chunks
        const chunks = await db.query.supportDocumentChunks.findMany({
            where: (chunks, { ilike, and, eq }) => and(
                ilike(chunks.content, `%${query}%`),
                eq(chunks.document.supportBotId, supportBotId)
            ),
            limit: 3
        });
        
        if (chunks.length === 0) {
            return "I couldn't find specific information about that in our knowledge base. Let me help you with your membership details or connect you with a human agent.";
        }
        
        return `Based on our knowledge base: ${chunks.map(c => c.content).join('\n\n')}`;
    },
    {
        name: "search_knowledge",
        description: 'Search the knowledge base for general facility and policy information',
        schema: z.object({
            query: z.string().describe('Search query for the knowledge base'),
        }),
    }
);

// Escalate to human tool
export const escalateToHuman = tool(
    async ({ reason, urgency }, context) => {
        const conversationId = context?.conversationId;
        
        // Mark conversation for human takeover
        await db.update(supportConversations)
            .set({ 
                isVendorActive: false,
                metadata: { escalationReason: reason, urgency, escalatedAt: new Date() }
            })
            .where(eq(supportConversations.id, conversationId));
        
        return `I've escalated your request to our support team. A human agent will be with you shortly to help with: ${reason}`;
    },
    {
        name: "escalate_to_human", 
        description: 'Escalate the conversation to a human agent when the bot cannot help',
        schema: z.object({
            reason: z.string().describe('Reason for escalation'),
            urgency: z.enum(['low', 'medium', 'high']).describe('Urgency level'),
        }),
    }
);

// Create support ticket tool
export const createSupportTicket = tool(
    async ({ title, description, priority }, context) => {
        const conversationId = context?.conversationId;
        
        const ticket = await db.insert(supportTickets).values({
            conversationId,
            title,
            description,
            priority,
            status: 'open'
        }).returning();
        
        return `Support ticket #${ticket[0].id} created successfully. I'll track this issue for you.`;
    },
    {
        name: "create_support_ticket",
        description: 'Create a support ticket for tracking customer issues',
        schema: z.object({
            title: z.string().describe('Brief title for the support ticket'),
            description: z.string().describe('Detailed description of the issue'),
            priority: z.number().min(1).max(3).describe('Priority level: 1=high, 2=medium, 3=low'),
        }),
    }
);

// Update ticket status tool
export const updateTicketStatus = tool(
    async ({ ticketId, status, notes }) => {
        await db.update(supportTickets)
            .set({ 
                status, 
                updatedAt: new Date(),
                metadata: { statusChangeNotes: notes }
            })
            .where(eq(supportTickets.id, ticketId));
        
        return `Ticket #${ticketId} status updated to ${status}`;
    },
    {
        name: "update_ticket_status",
        description: 'Update the status of a support ticket',
        schema: z.object({
            ticketId: z.string().describe('The ID of the ticket to update'),
            status: z.enum(['open', 'in_progress', 'resolved', 'closed']).describe('New status for the ticket'),
            notes: z.string().optional().describe('Additional notes about the status change'),
        }),
    }
);

// Build support tools array
export function buildSupportTools(availableTools: any[]) {
    const toolMap = {
        // Member-focused tools
        'member_status': getMemberStatus,
        'member_billing': getMemberBilling,
        'member_bookable_sessions': getMemberBookableSessions,
        
        // Ticket management tools
        'create_ticket': createSupportTicket,
        'update_ticket': updateTicketStatus,
        
        // General support tools
        'search_knowledge': searchKnowledge,
        'escalate_human': escalateToHuman,
    };
    
    return availableTools
        .filter(t => toolMap[t.name as keyof typeof toolMap])
        .map(t => toolMap[t.name as keyof typeof toolMap]);
}
```

---

## 🔤 **Phase 6: Types Migration**

### **6.1 Support Bot Types**

#### `/src/types/supportBot.ts`
```typescript
export type SupportBot = {
    id: string
    locationId: string
    name: string
    prompt: string
    initialMessage: string
    temperature: number
    model: "anthropic" | "gpt" | "gemini"
    status: "Draft" | "Active" | "Paused"
    availableTools: SupportTool[]
    created: Date
    updated: Date | null
}

export type SupportTool = {
    name: string
    description: string
    parameters?: Record<string, any>
}

export type SupportTrigger = {
    id: string
    supportBotId: string
    name: string
    triggerType: "keyword" | "intent" | "condition"
    triggerPhrases: string[]
    toolCall: Record<string, any>
    examples: string[]
    requirements: string[]
    isActive: boolean
    created: Date
    updated: Date | null
}

export type SupportBotPersona = {
    id: string
    supportBotId: string
    name: string
    image?: string
    responseStyle: string
    personalityTraits: string[]
    created: Date
    updated: Date | null
}

#### `/src/types/supportTickets.ts`
```typescript
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type SupportTicket = {
    id: string;
    conversationId: string;
    title: string;
    description?: string;
    status: TicketStatus;
    priority: number; // 1=high, 2=medium, 3=low
    assignedTo?: string;
    created: Date;
    updated: Date | null;
    metadata?: Record<string, any>;
};
```

### **6.2 Support Conversation Types**

#### `/src/types/supportConversations.ts`
```typescript
export type SupportConversation = {
    id: string;
    supportBotId: string;
    memberId?: string;
    guestContactId?: string;
    vendorId?: string;
    takenOverAt?: Date;
    isVendorActive: boolean;
    metadata: Record<string, any>;
    created: Date;
    updated: Date | null;
}

export type SupportMessage = {
    id: string;
    conversationId: string;
    content: string;
    role: 'user' | 'ai' | 'vendor' | 'system';
    channel: 'WebChat' | 'Email' | 'System';
    metadata: Record<string, any>;
    created: Date;
}
```

---

## 📊 **Implementation Summary**

This migration plan has been **significantly simplified** from the original complex multi-bot workflow system to focus on:

### ✅ **What's Included:**
1. **Single support bot per location** (auto-created)
2. **Simple Q&A with direct AI processing** (no complex queues)
3. **User-defined triggers** for hard tool call execution
4. **Fixed set of tools**: ticket management, knowledge search, escalation
5. **Vendor takeover functionality** for human intervention
6. **Basic ticket management** with automatic creation
7. **Knowledge base integration** with document upload
8. **Member app integration** for customer support

### ❌ **What's Removed:**
1. ~~Multiple bot creation/deletion~~
2. ~~Visual node workflow builder~~
3. ~~Complex BullMQ queue processing~~
4. ~~Node flow execution engines~~
5. ~~Complex session state tracking~~
6. ~~ReactFlow canvas components~~
7. ~~Multi-step workflow orchestration~~

### 🎯 **Benefits of Simplified Approach:**
- **Faster implementation** (6 weeks vs 12+ weeks)
- **Lower complexity** and maintenance burden
- **Immediate value** through Q&A support
- **Human escalation** when bot can't help
- **Ticket tracking** for issue management
- **Knowledge base** for consistent answers

This approach delivers **80% of the value with 20% of the complexity**, allowing you to ship quickly and iterate based on user feedback.

---

## 🚦 **Migration Execution Timeline**

### **Phase 1: Database Setup (Week 1)**
- [ ] Create support bot database schema (simplified tables)
- [ ] Run migrations on development database
- [ ] Update dependencies (remove complex queue/node dependencies)
- [ ] Set up simplified environment variables
- [ ] Test database connections

### **Phase 2: Backend APIs (Week 2)**
- [ ] Create support bot configuration API routes
- [ ] Implement simple chat processing with direct AI calls
- [ ] Create trigger management APIs
- [ ] Create knowledge base upload APIs
- [ ] Create ticket management APIs
- [ ] Test all endpoints

### **Phase 3: Frontend Components (Week 3)**
- [ ] Create simplified support bot dashboard
- [ ] Build chat testing interface (no complex flows)
- [ ] Create trigger management UI
- [ ] Create knowledge base management UI
- [ ] Create ticket viewing interface
- [ ] Test component integration

### **Phase 4: Member App Integration (Week 4)**
- [ ] Add simple chat interface to member app
- [ ] Implement direct AI processing for members
- [ ] Add vendor takeover functionality
- [ ] Test member-to-support-bot flow
- [ ] Test vendor intervention capabilities

### **Phase 5: Testing & Polish (Week 5)**
- [ ] End-to-end testing of simplified support flow
- [ ] Performance testing and optimization
- [ ] Error handling and edge case testing
- [ ] User acceptance testing
- [ ] Bug fixes and polish

### **Phase 6: Launch (Week 6)**
- [ ] Production database migrations
- [ ] Deploy simplified support bot system
- [ ] Monitor for issues and performance
- [ ] Documentation and training
- [ ] Gather user feedback for iterations

---

## 🎯 **Success Criteria**

### **MVP Launch Requirements**
- [ ] Location owners can configure one support bot per location
- [ ] Support bot can answer questions using knowledge base
- [ ] Trigger system works for defined scenarios
- [ ] Members can chat with support bot from member app
- [ ] Vendors can take over conversations when needed
- [ ] Tickets are automatically created and managed
- [ ] System is stable with <5% error rate

### **Performance Targets**
- [ ] <2 second response time for bot replies
- [ ] 90% uptime for support chat functionality
- [ ] Support bot resolves 70% of simple queries without escalation
- [ ] Member satisfaction score >70% for bot interactions

---

## 📝 **Key Decisions Made**

1. **Simplified Architecture**: Removed complex queue processing and visual node builders
2. **Single Bot Per Location**: No multiple bot creation/management complexity  
3. **Direct AI Processing**: Simple streaming responses using existing LangChain setup
4. **Complete Support Tool Set**: Fixed set of practical member support and ticket management tools:
   - **Member Status**: Get subscription/package status and details
   - **Member Billing**: View payment methods and transaction history
   - **Bookable Sessions**: See available classes based on memberships
   - **Ticket Creation**: Create support tickets for issue tracking
   - **Ticket Management**: Update ticket status and add notes
   - **Knowledge Search**: General facility and policy information
   - **Human Escalation**: Vendor takeover for complex issues
5. **Vendor Takeover**: Human intervention capability built-in
6. **Practical Use Cases**: Focus on real member support needs, not complex workflows

## 🎯 **Support Bot Value Proposition**

**For Members:**
- ✅ **Instant membership info** - "What's my subscription status?"
- ✅ **Quick billing queries** - "When is my next payment?"
- ✅ **Class availability** - "What classes can I book with my package?"
- ✅ **Issue tracking** - Automatic ticket creation and status updates
- ✅ **24/7 availability** - Get answers and support anytime without waiting for staff
- ✅ **Consistent information** - Always up-to-date member data

**For Location Owners:**
- ✅ **Reduced support workload** - Bot handles routine membership questions and ticket creation
- ✅ **Issue tracking** - All support conversations automatically become tickets
- ✅ **Happy members** - Instant answers and proper issue management improve satisfaction
- ✅ **Easy setup** - Simple configuration, no complex workflows
- ✅ **Smart escalation** - Human agents handle only complex issues with full ticket context

This approach prioritizes **shipping quickly** with **core member value** while maintaining the ability to **iterate and expand** based on user feedback.
