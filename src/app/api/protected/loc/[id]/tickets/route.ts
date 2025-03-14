import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/db"; 

export async function POST(req: NextRequest) {
  const newTicket = await req.json();
  try {
    const user = await auth();

    if (user) {
      const result = await db.insert("messages").into("tickets_messages")
        .set({
          ticket_id: newTicket.ticketId,
          message: newTicket.message,
          // Add other fields as needed
        })
        .returning("*");

      return NextResponse.json({ result }, { status: 201 });
    }
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}