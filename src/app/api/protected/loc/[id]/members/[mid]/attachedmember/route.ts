import { db } from "@/db/db";
import { familyMembers } from "@/db/schemas";
import { NextResponse } from "next/server";

export async function POST(request: Request) {


  try {

    const url = new URL(request.url);
    const memberId = url.pathname.split("/").pop(); // Extract memberId from the URL

    if (!memberId) {
      return NextResponse.json(
        { message: "No member ID provided" },
        { status: 400 }
      );
    }

    // Parse and validate the request body
    const body = await request.json();
    
  } catch (error) {
    
  }
  

}