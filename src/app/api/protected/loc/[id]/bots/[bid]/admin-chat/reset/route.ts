import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { resetSession } from "@/libs/server/ai/node-processor";

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
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "SessionId is required" },
        { status: 400 }
      );
    }

    // Reset the session in Redis
    await resetSession(params.bid, sessionId);

    return NextResponse.json({
      success: true,
      message: "Node flow session reset successfully",
      sessionId,
      botId: params.bid,
    });
  } catch (error) {
    console.error("Error resetting node flow session:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
