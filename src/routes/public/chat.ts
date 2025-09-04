import { Elysia } from 'elysia';
import { ChatAIService } from '@/libs/ai/chat-ai.service';

const chatAIService = new ChatAIService();

export const PublicChatRoutes = new Elysia({ prefix: '/chat' })
  
  // Send message in chat conversation
  .post('/message', async ({ body, set }) => {
    try {
      // TODO: Add authentication
      // const { memberId, locationId } = await jwt.verify();
      
      // For testing: get from request body
      const { memberId, locationId, message, conversationId } = body as {
        memberId: string;
        locationId: string;
        message: string;
        conversationId?: string;
      };

      console.log(`🧪 TEST MODE: Processing message for member ${memberId} at location ${locationId}`);

      if (!memberId || !locationId || !message) {
        set.status = 400;
        return { error: 'memberId, locationId, and message are required for testing' };
      }

      // TODO: Uncomment when authentication is added
      // // Validate member has access to this location
      // const hasAccess = await chatAIService.validateMemberAccess(memberId, locationId);
      // if (!hasAccess) {
      //   set.status = 403;
      //   return { error: 'Member not associated with this location' };
      // }

      // Generate AI response using existing bot config
      const aiResponse = await chatAIService.generateResponse(
        memberId,
        locationId,
        message,
        conversationId
      );

      return {
        success: true,
        data: aiResponse
      };

    } catch (error) {
      console.error('💥 Chat message error:', error);
      set.status = 500;
      return { 
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get member's conversations (for testing)
  .get('/conversations/member/:memberId/:locationId', async ({ params, set }) => {
    try {
      // TODO: Add authentication
      // const { memberId, locationId } = await jwt.verify();
      
      const { memberId, locationId } = params;
      
      console.log(`🧪 TEST MODE: Getting conversations for member ${memberId} at location ${locationId}`);

      const result = await chatAIService.getMemberConversations(memberId, locationId);
      
      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('💥 Error fetching conversations:', error);
      set.status = 500;
      return { 
        error: 'Failed to fetch conversations',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get specific conversation with messages
  .get('/conversations/:conversationId', async ({ params, set }) => {
    try {
      // TODO: Add authentication
      // const { memberId } = await jwt.verify();
      
      const { conversationId } = params;
      const memberId = 'test-member-123'; // TODO: Get from auth
      
      console.log(`🧪 TEST MODE: Getting conversation ${conversationId}`);

      const history = await chatAIService.getConversationHistory(conversationId, memberId);
      
      return {
        success: true,
        data: history
      };

    } catch (error) {
      console.error('💥 Error fetching conversation:', error);
      set.status = 500;
      return { 
        error: 'Failed to fetch conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get conversation messages (matching monstro-15 pattern)
  .get('/conversations/:conversationId/messages', async ({ params, set }) => {
    try {
      // TODO: Add authentication
      // const { memberId } = await jwt.verify();
      
      const { conversationId } = params;
      const memberId = 'test-member-123'; // TODO: Get from auth
      
      console.log(`🧪 TEST MODE: Getting messages for conversation ${conversationId}`);

      const history = await chatAIService.getConversationHistory(conversationId, memberId);
      
      return {
        success: true,
        data: {
          messages: history.messages,
          conversation: history.conversation
        }
      };

    } catch (error) {
      console.error('💥 Error fetching conversation messages:', error);
      set.status = 500;
      return { 
        error: 'Failed to fetch conversation messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Create new conversation (for testing)
  .post('/conversations', async ({ body, set }) => {
    try {
      // TODO: Add authentication
      // const { memberId } = await jwt.verify();
      
      const { memberId, locationId, initialMessage } = body as {
        memberId: string;
        locationId: string;
        initialMessage?: string;
      };

      console.log(`🧪 TEST MODE: Creating conversation for member ${memberId} at location ${locationId}`);

      if (!memberId || !locationId) {
        set.status = 400;
        return { error: 'memberId and locationId are required for testing' };
      }

      // Create conversation by sending initial message
      const response = await chatAIService.generateResponse(
        memberId,
        locationId,
        initialMessage || 'Hello, I need help with my membership'
      );

      return {
        success: true,
        data: response,
        message: 'Conversation created successfully'
      };

    } catch (error) {
      console.error('💥 Error creating conversation:', error);
      set.status = 500;
      return { 
        error: 'Failed to create conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Health check for chat service
  .get('/health', async () => {
    try {
      return {
        status: 'ok',
        service: 'chat-ai',
        timestamp: new Date().toISOString(),
        features: {
          botConfig: 'active',
          memberContext: 'active', 
          functionHandlers: 'active',
          aiModels: process.env.OPENAI_API_KEY ? 'configured' : 'missing-api-key'
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
