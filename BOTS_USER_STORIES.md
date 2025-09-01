# 🤖 Bot Feature User Stories

## 📋 **Overview**

This document outlines user stories for migrating bot functionality from monstro-bots to monstro-15. Stories are prioritized for fast shipping while ensuring core functionality is complete.

**Priority Levels:**
- **P0 (MVP)**: Must have for initial release
- **P1 (Enhancement)**: Nice to have for v1.1
- **P2 (Future)**: Future iterations

---

## 🎯 **Epic 1: Basic Bot Management**

### **User Story 1.1: Create a Bot** ⭐ P0
**As a** location owner  
**I want to** create a new bot for my location  
**So that** I can automate customer interactions  

**Acceptance Criteria:**
- [x] I can access the bots page from location dashboard navigation
- [x] I can click "Create Bot" and see a creation form
- [x] I can enter bot name, initial message, and basic prompt
- [x] I can select AI model (GPT, Claude, or Gemini)
- [x] I can set temperature (creativity level) via slider
- [x] I can save the bot and see it appear in my bots list
- [x] The bot is created with "Draft" status by default
- [x] I receive confirmation when bot is successfully created

**Technical Requirements:**
- Bot creation API endpoint functional
- Form validation prevents empty required fields
- Bot appears in database with correct location association

### **User Story 1.2: View My Bots** ⭐ P0
**As a** location owner  
**I want to** see all bots I've created for my location  
**So that** I can manage and organize my bots  

**Acceptance Criteria:**
- [x] I can see a list of all my bots on the bots dashboard
- [x] Each bot shows name, status (Draft/Active/Paused), and last updated date
- [x] I can click on a bot to select it for editing or testing
- [x] Empty state shows helpful message when no bots exist
- [x] Bots are sorted by most recently updated first

**Technical Requirements:**
- Bots API returns only bots for current location
- Real-time updates when bots are modified
- Proper loading states during data fetching

### **User Story 1.3: Edit Bot Configuration** ⭐ P0
**As a** location owner  
**I want to** edit my bot's basic settings  
**So that** I can improve its responses and behavior  

**Acceptance Criteria:**
- [x] I can select a bot and see its configuration panel
- [x] I can edit bot name, prompt, initial message, and temperature
- [x] I can change the AI model (GPT, Claude, Gemini)
- [x] I can save changes and see "Bot Updated" confirmation
- [x] Changes are immediately reflected in bot behavior
- [x] I can discard unsaved changes

**Technical Requirements:**
- Form pre-populated with current bot settings
- Real-time validation on required fields
- API updates bot configuration correctly

### **User Story 1.3.1: Create AI Personas** ⭐ P1
**As a** location owner  
**I want to** create AI personas for my bots  
**So that** I can give my bots distinct personalities and response styles  

**Acceptance Criteria:**
- [x] I can click "Add Persona" to open persona creation dialog
- [x] I can enter persona name, response style, and select personality traits
- [x] I can choose from predefined avatar images
- [x] I can save the persona and see "Persona created successfully" confirmation
- [x] New persona appears in the available personas list
- [x] Form validation prevents empty required fields

**Technical Requirements:**
- Persona creation API endpoint (`POST /api/protected/loc/[id]/personas`)
- Form validation with proper error handling
- Persona data stored with location association

### **User Story 1.3.2: Attach Personas to Bots** ⭐ P1
**As a** location owner  
**I want to** attach AI personas to my bots  
**So that** my bots can respond with specific personalities and styles  

**Acceptance Criteria:**
- [x] I can see "No persona attached" message when bot has no persona
- [x] I can click "Add Persona" dropdown to see available options
- [x] I can select "Select Existing" to choose from my created personas
- [x] I can attach a persona and see it immediately displayed in bot config
- [x] Persona shows with name, avatar, and personality traits
- [x] I can remove attached persona with trash icon
- [x] Changes persist after saving bot configuration

**Technical Requirements:**
- Bot-persona relationship API (`PUT /api/protected/loc/[id]/bots/[bid]`)
- Real-time UI updates when personas are attached/detached
- Proper state management for immediate visual feedback

### **User Story 1.3.3: Manage Personas** ⭐ P2
**As a** location owner  
**I want to** view and select from my existing personas  
**So that** I can reuse personalities across multiple bots  

**Acceptance Criteria:**
- [x] I can see all my created personas in selection dialog
- [x] Each persona displays name, avatar, and key personality traits
- [x] Currently attached persona shows "Current" badge
- [x] I can see persona details before attaching
- [x] Personas are filtered by my location only
- [x] Empty state message when no personas exist

**Technical Requirements:**
- Personas list API (`GET /api/protected/loc/[id]/personas`)
- UI state management for current persona indication
- Proper filtering and display of persona information

### **User Story 1.4: Delete a Bot** ⭐ P0
**As a** location owner  
**I want to** delete bots I no longer need  
**So that** I can keep my bot list organized  

**Acceptance Criteria:**
- [x] I can click a delete button on any bot
- [x] I see a confirmation dialog warning about permanent deletion
- [x] I can confirm deletion and bot is removed from list
- [x] I can cancel deletion and return to bot list
- [x] Deleted bots cannot be recovered (permanent action)

**Technical Requirements:**
- Cascade deletion removes all related data (conversations, progress, etc.)
- Confirmation prevents accidental deletions
- Proper error handling if deletion fails

---

## 💬 **Epic 2: Bot Chat Testing**

### **User Story 2.1: Test Bot with Queue Processing (Dummy Member Chat)** ⭐ P0
**As a** location owner  
**I want to** test my bot exactly as members will experience it  
**So that** I can verify node flows work correctly before going live  

**Acceptance Criteria:**
- [ ] I can see a chat interface when a bot is selected
- [ ] I can type messages and they are processed through the queue system
- [ ] Bot follows visual node flows I designed in the builder
- [ ] Test chat behaves identically to member app chat
- [ ] I can see node transitions and tool executions during testing
- [ ] Queue processing handles complex conversation flows
- [ ] Session state tracks current node position throughout conversation
- [ ] Admin test uses same processing engine as member chats

**Technical Requirements:**
- Chat messages queued through BullMQ for node flow processing
- `process-admin-chat` job uses same engine as `process-member-chat`
- Node flow execution engine processes visual builder logic
- Session management tracks conversation state and current node
- Tool calls execute within node flow context

### **User Story 2.2: Reset Node Flow Session** ⭐ P0
**As a** location owner  
**I want to** reset the chat to test different node flow paths  
**So that** I can verify all branches of my conversation flow work  

**Acceptance Criteria:**
- [ ] I can click a "Reset Flow" button in the chat interface
- [ ] Node flow session resets to the starting node
- [ ] Previous conversation state and collected data is cleared
- [ ] Bot returns to initial message and starting node behavior
- [ ] New test session starts fresh through the queue processing
- [ ] I can test different conversation paths from the beginning

**Technical Requirements:**
- Session reset clears Redis session data and node state
- Queue processing reinitializes with starting node
- New session ID generated for flow isolation
- Chat UI resets to initial state with starting node context

### **User Story 2.3: Test with Dummy Member Context** ⭐ P0
**As a** location owner  
**I want to** test my bot with realistic member context  
**So that** I can verify personalization and node flows work with member data  

**Acceptance Criteria:**
- [ ] I can select a test contact with dummy member information
- [ ] Bot processes conversations through queue with member context
- [ ] Node flows execute with personalized member data
- [ ] Bot responses are personalized based on test member profile
- [ ] Queue processing includes member context in session state
- [ ] Test behavior matches exactly what members will experience

**Technical Requirements:**
- Test contact provides realistic member data for queue processing
- Bot context includes member information during node flow execution
- Queue session state includes test member profile
- Node processing personalizes responses based on test context

---

## 🎯 **Epic 3: Visual Node Builder & Queue Processing**

### **User Story 3.1: Visual Node Builder Interface** ⭐ P0
**As a** location owner  
**I want to** design conversation flows using a visual node builder  
**So that** I can create sophisticated chat experiences without coding  

**Acceptance Criteria:**
- [ ] I can access the visual builder from "Flow Builder" tab in bot configuration
- [ ] I can see a ReactFlow canvas with drag-and-drop functionality
- [ ] I can add different node types (Standard, Condition, Extraction, Booking, Delay)
- [ ] I can connect nodes with directional arrows to create conversation flows
- [ ] I can configure each node with goals, instructions, and tools
- [ ] I can set branching conditions based on user responses
- [ ] I can save the flow and see it execute in chat testing
- [ ] Flow validation prevents broken or invalid configurations

**Technical Requirements:**
- ReactFlow integration for visual flow design
- Node configuration panels for each node type
- Flow validation and error checking
- Integration with queue processing system for execution

### **User Story 3.2: Node Flow Execution Engine** ⭐ P0
**As a** location owner  
**I want to** see my visual flows execute correctly during conversations  
**So that** the bot follows the logic I designed  

**Acceptance Criteria:**
- [ ] Bot starts at the designated start node when conversation begins
- [ ] Queue processing system executes node goals and instructions correctly
- [ ] Tool calls within nodes trigger appropriate actions
- [ ] Branching logic navigates to correct next nodes based on conditions
- [ ] Condition nodes evaluate user responses and route accordingly
- [ ] Extraction nodes collect and store user information in session state
- [ ] Flow state is maintained throughout the conversation via queue processing
- [ ] Node execution works identically for admin test and member chats

**Technical Requirements:**
- BullMQ queue processes chat jobs through node flow engine
- Node processor executes visual flow logic correctly
- Session state tracking for current node position and collected data
- Tool integration for node functions and branching logic
- Consistent execution for both `process-admin-chat` and `process-member-chat` jobs

## 🎛️ **Epic 4: Scenario Management**

### **User Story 4.1: Create Bot Scenarios** ⭐ P1
**As a** location owner  
**I want to** create scenarios that trigger specific bot behaviors  
**So that** my bot can handle different customer situations  

**Acceptance Criteria:**
- [ ] I can click "Add Scenario" and see creation form
- [ ] I can enter scenario name and trigger phrase
- [ ] I can add multiple example phrases that should trigger this scenario
- [ ] I can add requirements that must be met before scenario activates
- [ ] I can save scenario and see it in my bot's scenario list
- [ ] Scenarios are immediately available for testing

**Technical Requirements:**
- Scenario creation API stores trigger phrases and examples
- Form validation ensures required fields are filled
- Scenarios linked to specific bots correctly

### **User Story 4.2: Test Scenario Triggers** ⭐ P1
**As a** location owner  
**I want to** verify my scenarios trigger correctly  
**So that** I know my bot will handle situations properly  

**Acceptance Criteria:**
- [ ] When I type trigger phrases in chat, appropriate scenario activates
- [ ] Bot behavior changes based on active scenario
- [ ] I can see indication when a scenario has been triggered
- [ ] Multiple scenarios can be tested in sequence
- [ ] Failed trigger attempts don't break bot functionality

**Technical Requirements:**
- Scenario evaluation during chat processing
- Trigger matching works with variations of phrases
- Proper fallback when no scenarios match

### **User Story 4.3: Manage Scenarios** ⭐ P1
**As a** location owner  
**I want to** edit and delete existing scenarios  
**So that** I can improve my bot's behavior over time  

**Acceptance Criteria:**
- [ ] I can see list of all scenarios for selected bot
- [ ] I can edit scenario details (name, triggers, examples, requirements)
- [ ] I can delete scenarios I no longer need
- [ ] I can see how many scenarios each bot has
- [ ] Changes take effect immediately in chat testing

**Technical Requirements:**
- Scenario management API supports CRUD operations
- Real-time updates when scenarios are modified
- Proper cleanup when scenarios are deleted

---

## 📚 **Epic 5: Knowledge Base**

### **User Story 5.1: Upload Documents** ⭐ P0
**As a** location owner  
**I want to** upload PDF documents to my bot's knowledge base  
**So that** my bot can answer questions using my business information  

**Acceptance Criteria:**
- [ ] I can access "Knowledge Base" section for my bot
- [ ] I can drag and drop PDF files or click to select them
- [ ] I can see upload progress for each file
- [ ] Successfully uploaded documents appear in knowledge base list
- [ ] I can see document name, size, and upload date
- [ ] Upload fails gracefully for invalid file types

**Technical Requirements:**
- File upload API accepts PDF files only
- Document processing extracts text for embedding
- Proper error handling for corrupted or invalid files
- File storage with unique identifiers

### **User Story 5.2: Test Knowledge Queries** ⭐ P0
**As a** location owner  
**I want to** ask questions about uploaded documents in chat  
**So that** I can verify my bot has access to the information  

**Acceptance Criteria:**
- [ ] When I ask questions related to uploaded documents, bot provides relevant answers
- [ ] Bot indicates when information comes from knowledge base
- [ ] Bot responds appropriately when asked about information not in documents
- [ ] Knowledge integration works with all AI models
- [ ] Multiple documents can be referenced in single conversation

**Technical Requirements:**
- RAG (Retrieval Augmented Generation) system functional
- Vector embeddings generated for uploaded documents
- Semantic search retrieves relevant document chunks
- Knowledge integration in chat API

### **User Story 5.3: Manage Documents** ⭐ P0
**As a** location owner  
**I want to** remove documents from my knowledge base  
**So that** I can keep information current and accurate  

**Acceptance Criteria:**
- [ ] I can see all uploaded documents in knowledge base list
- [ ] I can delete individual documents
- [ ] Deleted documents no longer appear in bot responses
- [ ] I receive confirmation when documents are successfully deleted
- [ ] Deletion is permanent and cannot be undone

**Technical Requirements:**
- Document deletion removes file and all associated embeddings
- Knowledge base updates immediately after deletion
- Proper cleanup of vector database entries

---

## 👥 **Epic 6: Member Integration (P0 Focus)**

*Note: Focusing on member chat integration only. External guest contacts removed for P0.*

### **User Story 6.1: Handle Member Conversations** ⭐ P0
**As a** member of a location  
**I want to** chat with the location's bot  
**So that** I can get information and assistance related to my membership  

**Acceptance Criteria:**
- [ ] When I chat with bot, it recognizes me as a member
- [ ] Bot can access my member information for personalized responses
- [ ] My conversation history is saved and associated with my member account
- [ ] Bot can reference my membership status, points, or other member data
- [ ] Member-specific features work correctly (if implemented)

**Technical Requirements:**
- Chat API identifies and handles member contacts
- Member data accessible during bot conversations
- Conversation tracking linked to member records
- Proper data privacy and access controls

### **User Story 6.2: Member Chat Processing with Queue System** ⭐ P0
**As a** member  
**I want to** chat with bots using the same queue processing as admin testing  
**So that** I get consistent and reliable bot responses  

**Acceptance Criteria:**
- [ ] My chat messages are processed through the same queue system as admin testing
- [ ] Bot executes visual node flows designed by location owners
- [ ] Conversation follows the same logic and flow paths as admin testing
- [ ] Node transitions and tool executions work identically to admin test
- [ ] Session state and collected data is maintained through queue processing
- [ ] Response quality and behavior matches admin test experience

**Technical Requirements:**
- Member chat uses `process-member-chat` queue job
- Same node flow execution engine as admin testing
- Consistent session management and state tracking
- Identical tool execution and branching logic
- Queue processing handles member authentication context

---

## ⚙️ **Epic 7: System Management**

### **User Story 7.1: Bot Status Management** ⭐ P0
**As a** location owner  
**I want to** activate and pause my bots  
**So that** I can control when customers can interact with them  

**Acceptance Criteria:**
- [ ] I can change bot status between Draft, Active, and Paused
- [ ] Only Active bots are available for customer interactions
- [ ] Draft bots are only available for testing by me
- [ ] Paused bots show appropriate message to customers
- [ ] Status changes take effect immediately

**Technical Requirements:**
- Bot status field controls public availability
- Status validation in chat endpoints
- Proper messaging for inactive bots

### **User Story 7.2: Error Handling** ⭐ P0
**As a** user (location owner or customer)  
**I want to** receive helpful error messages when something goes wrong  
**So that** I understand what happened and can take appropriate action  

**Acceptance Criteria:**
- [ ] When bot fails to respond, I see helpful error message
- [ ] When upload fails, I see specific reason (file too large, wrong type, etc.)
- [ ] When network issues occur, I see retry options
- [ ] Error messages are user-friendly, not technical
- [ ] System remains stable even when errors occur

**Technical Requirements:**
- Comprehensive error handling in all APIs
- User-friendly error messages
- Proper logging for debugging
- Graceful degradation when services fail

### **User Story 7.3: Queue Performance Optimization** 📈 P1
**As a** user  
**I want to** fast response times from queue-processed bot conversations  
**So that** conversations feel natural and engaging even with complex node flows  

**Acceptance Criteria:**
- [ ] Queue processing completes node flow execution within 2 seconds
- [ ] Complex visual flows with multiple nodes don't cause delays
- [ ] Concurrent queue jobs don't interfere with each other
- [ ] Tool executions within nodes are processed efficiently
- [ ] Session state updates don't create bottlenecks
- [ ] Member and admin test chats have similar response times

**Technical Requirements:**
- Optimized BullMQ queue configuration for performance
- Efficient node flow execution algorithms
- Redis session management optimization
- Concurrent processing without job interference
- Performance monitoring for queue processing times
**As a** user  
**I want to** fast response times from bots  
**So that** conversations feel natural and engaging  

**Acceptance Criteria:**
- [ ] Bot responses start appearing within 2 seconds
- [ ] Chat interface remains responsive during conversations
- [ ] Document uploads complete within reasonable time
- [ ] Multiple concurrent conversations don't slow down responses
- [ ] System handles peak usage without degradation

**Technical Requirements:**
- Response streaming for immediate feedback
- Efficient database queries
- Proper caching strategies
- Load testing and optimization

---

## 📱 **Epic 8: Member App Integration & Queue Processing**

### **User Story 7.1: Access Bot Chat** ⭐ P0
**As a** member  
**I want to** access chat with my location's bots from the member app  
**So that** I can get instant support and information  

**Acceptance Criteria:**
- [ ] I can see a "Chat" or "Support" option in the member app navigation
- [ ] I can access chat for my current location
- [ ] Only active bots are available for chatting
- [ ] I am automatically authenticated based on my member login
- [ ] Chat interface is mobile-friendly and responsive
- [ ] I can see if bots are available or offline

**Technical Requirements:**
- Chat page accessible from member app navigation
- Supabase authentication validates member access
- Member app has independent AI processing capabilities
- API fetches only active bots using Supabase RLS
- Responsive design for mobile devices
- No dependency on admin portal for member chat functionality

### **User Story 7.2: Select and Chat with Bots** ⭐ P0
**As a** member  
**I want to** choose which bot to chat with and have real-time conversations  
**So that** I can get specific help based on my needs  

**Acceptance Criteria:**
- [ ] I can see available bots with their names and purposes
- [ ] I can select a bot and start chatting immediately
- [ ] Bot greets me with its initial message
- [ ] I can type messages and receive real-time responses
- [ ] Bot responses stream in naturally (not all at once)
- [ ] I can switch between different bots if multiple are available
- [ ] Conversation history is maintained during my session
- [ ] A ticket is automatically generated for each new chat session
- [ ] Bot can ask about issue resolution in natural conversation
- [ ] Bot can update ticket status via API when appropriate

**Technical Requirements:**
- Bot selector component with clear bot identification
- Real-time streaming responses from member app's AI processing
- Redis session management with smart recovery for conversation continuity
- Session TTL management (2 hours) with activity-based extension
- Bot switching preserves individual conversation histories
- Independent AI model integration (OpenAI, Anthropic, Gemini)
- Supabase RLS ensures secure bot data access
- Conversation state tracking (new/ongoing/booking/information_gathering)
- Automatic data extraction from user messages (email, phone, preferences)

### **User Story 7.3: Personalized Bot Interactions** ⭐ P0
**As a** member  
**I want to** receive personalized responses based on my member information  
**So that** the bot can provide relevant and helpful assistance  

**Acceptance Criteria:**
- [ ] Bot addresses me by my first name
- [ ] Bot can reference my membership status, points, or relevant data
- [ ] Bot provides information specific to my location and membership
- [ ] Bot remembers context from our conversation
- [ ] Responses are relevant to my member profile and history
- [ ] Bot can help with member-specific tasks (check points, etc.)

**Technical Requirements:**
- Member context retrieved via Supabase RLS during conversations
- Bot prompts include member profile data for personalization
- Personalization works without compromising privacy
- Member data access follows Supabase Row Level Security
- AI processing happens within member app security context

### **User Story 7.4: Session Continuity** ⭐ P0
**As a** member  
**I want to** continue conversations seamlessly even after breaks  
**So that** I don't have to repeat information or restart complex processes  

**Acceptance Criteria:**
- [ ] If I leave and return to chat, the bot remembers our conversation context
- [ ] The bot knows what information I've already provided (email, preferences, etc.)
- [ ] Multi-step processes (like booking) continue where I left off
- [ ] The bot's tone and responses reflect our ongoing conversation
- [ ] I don't have to re-explain my situation after returning
- [ ] Session recovery works even after hours of inactivity
- [ ] Between sessions, bot checks ticket status and asks about resolution naturally

**Technical Requirements:**
- Redis session management with 2-hour TTL
- Smart session recovery analyzes conversation history to restore context
- Conversation state tracking and automatic data extraction
- Session updates saved after each interaction
- Bot prompts include session context for continuity
- Graceful handling of expired sessions with intelligent recovery

### **User Story 7.5: Conversation History** 📈 P1
**As a** member  
**I want to** see my previous conversations with bots  
**So that** I can reference past interactions and continue where I left off  

**Acceptance Criteria:**
- [ ] I can see my recent chat history when I return to chat
- [ ] Conversations are organized by bot and date
- [ ] I can scroll up to see older messages in current session
- [ ] Previous conversations are accessible between app sessions
- [ ] I can clear or delete conversation history if desired
- [ ] History is private and not shared with other members

**Technical Requirements:**
- Conversation storage linked to member accounts via Supabase
- History retrieval using Supabase RLS queries
- Privacy controls ensure data isolation between members
- Efficient loading of conversation history from shared database
- Member app accesses conversation history independently

### **User Story 7.6: Offline and Error Handling** ⭐ P0
**As a** member  
**I want to** receive clear messages when bots are unavailable  
**So that** I know when to expect responses and can try again later  

**Acceptance Criteria:**
- [ ] I see clear message when no bots are active for my location
- [ ] I receive helpful error messages if chat fails
- [ ] I can retry sending messages if they fail
- [ ] I see loading indicators when messages are being processed
- [ ] Offline state is clearly communicated
- [ ] I can report issues or get alternative support options
- [ ] Session recovery failures are handled gracefully

**Technical Requirements:**
- Graceful error handling for all failure scenarios in member app
- Clear user feedback for system states
- Retry mechanisms for failed AI processing requests
- Fallback options when bots are unavailable or AI services are down
- Independent error handling without dependency on admin portal
- Proper handling of Supabase connection issues
- Redis connection failure handling with fallback to database-only mode

---

## 🎫 **Epic 8: Ticket Management System**

### **User Story 8.1: Queue-Based Automatic Ticket Creation** ⭐ P0
**As a** member chatting with a bot
**I want to** have a ticket automatically created through queue processing
**So that** my issues can be tracked and managed systematically

**Acceptance Criteria:**
- [ ] When I start a new chat session, queue processing creates a ticket automatically
- [ ] The ticket is linked to my conversation and member account
- [ ] I can see the ticket ID or reference in the conversation
- [ ] Tickets are created with "open" status by default
- [ ] Ticket metadata includes conversation context and member information
- [ ] Ticket creation works through both admin test and member chat queues

**Technical Requirements:**
- Ticket creation integrated into queue processing job initialization
- Automatic linking to conversation and member/guest contact through queue system
- Ticket status tracking with proper database relationships
- Queue processing handles ticket creation for both `process-admin-chat` and `process-member-chat` jobs

### **User Story 8.2: Queue-Based Issue Resolution Checking** ⭐ P0
**As a** member returning to chat
**I want to** be asked naturally about my issue resolution through queue processing
**So that** the bot can update ticket status appropriately

**Acceptance Criteria:**
- [ ] When I return to chat after some time, queue processing includes ticket checking
- [ ] Questions are phrased naturally in node flow conversation logic
- [ ] Bot can understand my responses about issue status through queue processing
- [ ] Bot can call tools to update ticket status during queue job execution
- [ ] Conversation continues smoothly regardless of ticket updates
- [ ] Issue resolution checking works identically in admin test and member chats

**Technical Requirements:**
- Queue processing includes ticket status checking during session recovery
- AI prompts include ticket context and resolution checking logic through queue system
- Tool integration for ticket status updates within queue processing
- Natural language processing for resolution responses through node flow execution

### **User Story 8.3: Queue-Based Ticket Status Updates via Tools** ⭐ P0
**As a** bot during queue-processed conversation
**I want to** be able to update ticket status through queue processing
**So that** I can mark issues as resolved when appropriate

**Acceptance Criteria:**
- [ ] Bot can call ticket update tools during queue processing
- [ ] Ticket status changes are reflected in the database after queue job completion
- [ ] Status updates include timestamps and metadata
- [ ] Bot can confirm status changes to the member
- [ ] Multiple status updates are handled correctly through queue processing
- [ ] Tool calls work identically in admin test and member chat queues

**Technical Requirements:**
- Tool definitions for ticket status updates within queue processing context
- API endpoints for secure ticket status changes during queue job execution
- Proper authentication and authorization for ticket updates through queue system
- Database transaction handling for status changes after queue processing
- Queue processing maintains ticket context throughout conversation flow

### **User Story 8.4: Ticket History and Tracking** 📈 P1
**As a** location owner
**I want to** see ticket history and status for conversations
**So that** I can track issue resolution and member satisfaction

**Acceptance Criteria:**
- [ ] I can view all tickets for my location
- [ ] Tickets show status, creation date, and last update
- [ ] I can filter tickets by status (open, resolved)
- [ ] I can see conversation context for each ticket
- [ ] Ticket updates are logged with timestamps

**Technical Requirements:**
- Ticket management dashboard in admin portal
- API endpoints for ticket listing and filtering
- Proper data relationships for ticket tracking
- Audit trail for ticket status changes

---

## 🔧 **Epic 9: Advanced Features (P1/P2)**

*Note: Advanced features will integrate with queue processing system for consistency.*

### **User Story 8.1: Bot Templates** 📈 P1
**As a** location owner  
**I want to** create bots from pre-built templates  
**So that** I can quickly set up common bot types  

**Acceptance Criteria:**
- [ ] I can see available bot templates during creation
- [ ] I can preview template features and use cases
- [ ] I can create bot from template with one click
- [ ] Template bot includes pre-configured scenarios and prompts
- [ ] I can customize template bot after creation

### **User Story 8.2: Workflow Integration** 📈 P1
**As a** location owner  
**I want to** connect scenarios to automated workflows  
**So that** bot interactions can trigger business processes  

**Acceptance Criteria:**
- [ ] I can link scenarios to existing workflows
- [ ] When scenario triggers, associated workflow executes
- [ ] I can see workflow execution status in bot logs
- [ ] Failed workflows don't break bot conversations
- [ ] Workflow results can influence bot responses

*Note: This user story was moved to Epic 3 as it's P0 core functionality.*

### **User Story 8.4: Booking Integration** 📅 P2
**As a** customer  
**I want to** book appointments through bot conversation  
**So that** I can schedule services without leaving the chat  

**Acceptance Criteria:**
- [ ] Bot can show available appointment slots
- [ ] I can select preferred time from options
- [ ] Bot confirms booking and adds to calendar system
- [ ] I receive booking confirmation details
- [ ] Bot handles booking conflicts gracefully

---

## 📊 **Success Metrics**

### **MVP Launch Criteria (P0 Stories)**
- [ ] Location owners can create, configure, and test bots
- [ ] Chat interface provides real-time bot testing
- [ ] Basic scenario system works for simple triggers
- [ ] Knowledge base accepts PDF uploads and answers questions
- [ ] Both member and guest conversations are handled correctly
- [ ] Member app chat integration works end-to-end
- [ ] Cross-app authentication and API communication is secure
- [ ] System is stable and error-free for core functionality
- [ ] Ticket system automatically creates tickets for new sessions
- [ ] Bot can naturally check issue resolution and update ticket status

### **User Adoption Metrics**
- [ ] 80% of locations create at least one bot within first month
- [ ] Average of 3+ scenarios created per bot
- [ ] 90% uptime for chat functionality (both admin and member apps)
- [ ] <2 second average response time for bot replies
- [ ] <5% error rate for bot conversations
- [ ] 60% of members try chat feature within first 2 weeks
- [ ] Average of 5+ messages per member chat session
- [ ] 70% member satisfaction rating for bot interactions

### **Session Continuity Metrics**
- [ ] 95% successful session recovery rate after expiration
- [ ] <1 second session creation/recovery time
- [ ] 85% of returning members continue previous conversation context
- [ ] <3% of users report having to repeat information
- [ ] Average session duration of 20+ minutes before natural conclusion
- [ ] 90% of multi-step processes (bookings) completed without restart

### **Ticket System Metrics**
- [ ] 100% of new chat sessions create tickets automatically
- [ ] 80% of returning members are asked about issue resolution naturally
- [ ] 70% of resolved issues are properly marked by bot tool calls
- [ ] <5% error rate for ticket creation and status updates
- [ ] 90% of tickets have proper metadata and conversation context
- [ ] Average ticket resolution time tracked and monitored
- [ ] Ticket status accuracy maintained across session recovery

### **Quality Metrics**
- [ ] All P0 acceptance criteria pass automated tests
- [ ] Ticket features work as part of P0 MVP
- [ ] Manual testing confirms user flows work end-to-end
- [ ] Performance testing shows system handles expected load
- [ ] Security testing confirms data isolation and privacy
- [ ] Accessibility testing ensures interface is usable by all users

---

## 🚀 **Implementation Strategy**

### **Phase 1: Foundation (Week 1-2)**
- User Stories 1.1-1.4 (Basic Bot Management)
- User Stories 1.3.1-1.3.3 (AI Persona Management)
- User Stories 2.1-2.3 (Chat Testing)
- User Stories 6.1-6.2 (System Management)

### **Phase 2: Core Features (Week 3-4)**
- User Stories 3.1-3.2 (Visual Node Builder & Queue Processing)
- User Stories 4.1-4.3 (Scenario Management) 
- User Stories 5.1-5.3 (Knowledge Base)
- User Stories 6.1-6.2 (Member Integration)
- User Stories 8.1-8.3 (Queue-Based Ticket Management)

### **Phase 3: Member App Integration (Week 5)**
- User Stories 7.1-7.3 (Member Chat Access & Personalization)
- User Story 7.4 (Session Continuity with Smart Recovery)
- User Story 7.6 (Error Handling)
- Redis session management implementation
- Cross-app independent processing setup

### **Phase 4: Polish & Launch (Week 6)**
- Complete P0 testing and bug fixes (including member app)
- Performance optimization
- End-to-end testing of member-to-bot flow
- Documentation and training materials
- Production deployment (both apps)

### **Phase 5: Enhancements (Post-Launch)**
- User Story 7.4 (Conversation History)
- P1 stories based on user feedback
- Advanced features and integrations (Epic 8)
- Scaling and optimization improvements

This user story framework ensures you ship a complete, functional bot system quickly while maintaining quality and setting up for future enhancements.
