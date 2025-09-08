import { Elysia } from 'elysia';
import { ChatAIService } from '@/libs/ai/ChatAi.service';

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

