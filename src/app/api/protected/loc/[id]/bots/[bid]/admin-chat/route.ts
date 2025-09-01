import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq, and } from "drizzle-orm";
import { bots } from "@/db/schemas";
import { adminChatQueue } from "@/libs/server/queue";
import { AdminChatJobData } from "@/libs/server/workers/admin-chat-worker";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string; bid: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message, sessionId, contactId, contactType } = body;

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: "Message and sessionId are required" },
        { status: 400 }
      );
    }

    // Verify bot exists and is accessible
    const botData = await db
      .select({
        id: bots.id,
        name: bots.name,
        status: bots.status,
        locationId: bots.locationId,
      })
      .from(bots)
      .where(and(eq(bots.id, params.bid), eq(bots.locationId, params.id)))
      .limit(1);

    if (botData.length === 0) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    const bot = botData[0];

    // Allow testing of Draft and Active bots
    if (!["Active", "Draft"].includes(bot.status)) {
      return NextResponse.json(
        { error: "Bot is not available for testing" },
        { status: 403 }
      );
    }

    // Prepare job data for queue processing
    const jobData: AdminChatJobData = {
      locationId: params.id,
      botId: params.bid,
      sessionId,
      message,
      contactId,
      timestamp: new Date(),
    };

    // Add job to queue
    const job = await adminChatQueue.add("process-admin-chat", jobData, {
      jobId: `admin-chat-${sessionId}-${Date.now()}`,
      removeOnComplete: 10,
      removeOnFail: 5,
    });

    // Return job ID so frontend can track processing
    return NextResponse.json({
      success: true,
      jobId: job.id,
      sessionId,
      message: "Message queued for processing",
      bot: {
        id: bot.id,
        name: bot.name,
        status: bot.status,
      },
      note: "Phase 1: Basic queue integration active. Node flow processing will be added in Phase 2.",
    });
  } catch (error) {
    console.error("Error in admin chat endpoint:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// GET endpoint to check job status and get results
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string; bid: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    // Get job status and result
    const job = await adminChatQueue.getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const response = {
      jobId: job.id,
      status: await job.getState(),
      progress: job.progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error checking job status:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
