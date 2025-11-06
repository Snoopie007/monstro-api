import { auth } from "@/libs/auth";
import { buildUserPayload } from "@/libs/auth/UserContext";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  try {
    const userContext = await buildUserPayload(session.user.id);
    return NextResponse.json(userContext);
  } catch (error) {
    console.error("Error fetching user context:", error);
    return NextResponse.json(
      { error: "Failed to fetch user context" },
      { status: 500 }
    );
  }
}