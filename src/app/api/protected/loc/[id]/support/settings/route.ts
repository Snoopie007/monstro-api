import { db } from "@/db/db";
import { supportAssistants, supportTriggers } from "@/db/schemas";
import { SupportAssistantSettingsRequest } from "@/types";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assistant = await db.query.supportAssistants.findFirst({
      where: eq(supportAssistants.locationId, id),
    });
    if (!assistant) {
      return NextResponse.json(
        { error: "Support assistant not found for this location" },
        { status: 404 }
      );
    }

    const triggers = await db.query.supportTriggers.findMany({
      where: eq(supportTriggers.supportAssistantId, assistant.id),
    });

    const settings = {
      prompt: assistant?.prompt,
      initialMessage: assistant?.initialMessage,
      temperature: assistant?.temperature,
      model: assistant?.model,
      persona: {
        name: assistant?.persona.name,
        avatar: assistant?.persona.avatar,
        responseStyle: assistant?.persona.responseStyle,
        personality: assistant?.persona.personality,
      },
      triggers: triggers.map((trigger) => ({
        id: trigger.id,
        name: trigger.name,
        triggerType: trigger.triggerType,
        triggerPhrases: trigger.triggerPhrases,
        toolCall: trigger.toolCall,
        examples: trigger.examples,
        requirements: trigger.requirements,
        isActive: trigger.isActive,
      })),
      knowledgeBase: {
        qa_entries: assistant?.knowledgeBase.qa_entries,
        document: null,
        // TODO: implement documents
        // document: assistant?.knowledgeBase.document,
      },
    };
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching support assistant settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existingAssistant = await db.query.supportAssistants.findFirst({
      where: eq(supportAssistants.locationId, id),
    });
    if (!existingAssistant) {
      return NextResponse.json(
        { error: "Support assistant not found for this location" },
        { status: 404 }
      );
    }

    const {
      prompt,
      initialMessage,
      temperature,
      model: modelString,
      persona,
      triggers,
      knowledgeBase,
    } = (await req.json()) as SupportAssistantSettingsRequest;

    const response = await db.transaction(async (tx) => {
      // Delete existing triggers for this assistant
      await tx
        .delete(supportTriggers)
        .where(eq(supportTriggers.supportAssistantId, existingAssistant.id));

      const triggerValues = triggers.map((trigger) => ({
        supportAssistantId: existingAssistant.id,
        name: trigger.name,
        triggerType: trigger.triggerType,
        triggerPhrases: trigger.triggerPhrases,
        toolCall: trigger.toolCall,
        examples: trigger.examples,
        requirements: trigger.requirements,
        isActive: trigger.isActive,
      }));

      // Insert new triggers
      if (triggerValues && triggerValues.length > 0) {
        await tx.insert(supportTriggers).values(triggerValues).returning();
      }

      const assistant = await tx
        .update(supportAssistants)
        .set({
          prompt,
          initialMessage,
          temperature,
          modelId: modelString,
          persona,
          knowledgeBase: {
            qa_entries: knowledgeBase.qa_entries,
            // TODO: implement documents
            document: null,
          },
        })
        .where(eq(supportAssistants.id, existingAssistant.id))
        .returning();

      return {
        assistant,
        triggers: triggerValues,
      };
    });

    return NextResponse.json({
      success: true,
      data: response,
      message: "Support assistant settings updated successfully",
    });
  } catch (error) {
    console.error("Error updating support assistant settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
