import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq, and } from "drizzle-orm";
import { bots, botPersonas, aiPersona, memberLocations, members } from "@/db/schemas";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string; bid: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { messages, contactId, contactType } = body;

    // Fetch the bot with all necessary information
    const botWithRelations = await db
      .select({
        id: bots.id,
        name: bots.name,
        prompt: bots.prompt,
        temperature: bots.temperature,
        initialMessage: bots.initialMessage,
        model: bots.model,
        objectives: bots.objectives,
        status: bots.status,
        // Include persona information
        personas: {
          id: aiPersona.id,
          name: aiPersona.name,
          responseDetails: aiPersona.responseDetails,
          personality: aiPersona.personality,
        },
      })
      .from(bots)
      .leftJoin(botPersonas, eq(bots.id, botPersonas.botId))
      .leftJoin(aiPersona, eq(botPersonas.personaId, aiPersona.id))
      .where(and(
        eq(bots.id, params.bid),
        eq(bots.locationId, params.id)
      ));

    if (botWithRelations.length === 0) {
      return NextResponse.json(
        { error: "Bot not found" },
        { status: 404 }
      );
    }

    // Check if bot is active
    const botData = botWithRelations[0];
    if (botData.status !== "Active") {
      return NextResponse.json(
        { error: "Bot is not active" },
        { status: 403 }
      );
    }

    // Collect personas for the bot
    const bot = {
      id: botData.id,
      name: botData.name,
      prompt: botData.prompt,
      temperature: botData.temperature,
      initialMessage: botData.initialMessage,
      model: botData.model,
      objectives: botData.objectives,
      status: botData.status,
      personas: botWithRelations
        .filter(row => row.personas?.id)
        .map(row => row.personas)
        .filter((persona, index, self) => self.findIndex(p => p?.id === persona?.id) === index), // Remove duplicates
    };

    // Get contact information for context
    let contactInfo = null;
    if (contactId && contactType) {
      if (contactType === "member") {
        // Get member information
        const memberData = await db
          .select({
            id: members.id,
            firstName: members.firstName,
            lastName: members.lastName,
            email: members.email,
            phone: members.phone,
          })
          .from(memberLocations)
          .innerJoin(members, eq(memberLocations.memberId, members.id))
          .where(and(
            eq(memberLocations.locationId, params.id),
            eq(members.id, contactId)
          ))
          .limit(1);

        if (memberData.length > 0) {
          contactInfo = {
            ...memberData[0],
            type: "member" as const,
          };
        }
      } else if (contactType === "guest") {
        // Get guest contact information
        const guestData = await db.query.guestContacts.findFirst({
          where: (guestContacts, { eq, and }) => and(
            eq(guestContacts.id, contactId),
            eq(guestContacts.locationId, params.id)
          ),
        });

        if (guestData) {
          contactInfo = {
            id: guestData.id,
            firstName: guestData.firstName,
            lastName: guestData.lastName,
            email: guestData.email,
            phone: guestData.phone,
            type: "guest" as const,
          };
        }
      }
    }

    // For now, return a mock response since we don't have the full AI integration set up
    // This simulates what the actual AI response would look like
    const mockResponse = generateMockBotResponse(messages, bot, contactInfo);

    // In a real implementation, this would:
    // 1. Initialize or get Redis session
    // 2. Call the appropriate AI model (OpenAI, Anthropic, or Gemini)
    // 3. Process the response through bot scenarios and tools
    // 4. Save conversation to database
    // 5. Return streaming response

    return NextResponse.json({
      response: mockResponse,
      bot: {
        id: bot.id,
        name: bot.name,
      },
      contact: contactInfo,
      note: "This is a mock response for testing. Full AI integration will be implemented in the next phase."
    });

  } catch (error) {
    console.error("Error in bot chat:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Mock response generator for testing purposes
function generateMockBotResponse(messages: any[], bot: any, contactInfo: any) {
  const lastMessage = messages[messages.length - 1];
  const userMessage = lastMessage?.content || "";

  // Simple pattern matching for demo responses
  let response = "";

  if (userMessage.toLowerCase().includes("hello") || userMessage.toLowerCase().includes("hi")) {
    response = bot.initialMessage || `Hello! I'm ${bot.name || 'your AI assistant'}. How can I help you today?`;
  } else if (userMessage.toLowerCase().includes("help")) {
    response = "I'm here to help! I can assist you with information, answer questions, and guide you through various processes. What would you like to know?";
  } else if (userMessage.toLowerCase().includes("bye") || userMessage.toLowerCase().includes("goodbye")) {
    response = "Goodbye! It was nice chatting with you. Feel free to come back anytime!";
  } else if (contactInfo) {
    // Personalized response if contact info is available
    const greeting = contactInfo.firstName ? ` ${contactInfo.firstName}` : "";
    response = `Thanks for your message${greeting}! I understand you're asking about: "${userMessage}". This is a test response - the full AI integration will provide more intelligent and contextual replies.`;
  } else {
    response = `I received your message: "${userMessage}". This is a test response to demonstrate the chat functionality. The actual bot will provide more helpful and contextual responses based on its training and your specific needs.`;
  }

  // Add bot personality if available
  if (bot.personas && bot.personas.length > 0) {
    const persona = bot.personas[0];
    if (persona.personality && persona.personality.length > 0) {
      response += `\n\n${persona.personality[0]}`;
    }
  }

  return response;
}