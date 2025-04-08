import { db } from "@/db/db";
import { reservations } from "@/db/schemas/reservations";
import { Reservation } from "@/types";
import { cosineDistance, eq } from "drizzle-orm";
import next from "next";
import { NextResponse } from "next/server";


export async function GET(req: Request, props: { params: Promise<{ sid: number }> }) {
    
  const { sid } = await props.params;

  try {
      console.log("Fetching reservations for session ID:", sid);
      const reservation = await db.query.reservations.findMany({
        where: (reservations, { eq, and }) => and(
          eq(reservations.sessionId, sid),
          eq(reservations.status, "active")
        ),
      });

    console.log("Fetched reservations:", reservation);

    return NextResponse.json(reservation, { status: 200 });
    
  } catch (error) {

    new Error("Error fetching reservations: " + error);
    
  }

}