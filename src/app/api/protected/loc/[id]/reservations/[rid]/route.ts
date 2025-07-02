import { db } from "@/db/db";
import { NextResponse } from "next/server";


export async function GET(req: Request, props: { params: Promise<{ rid: string }> }) {

  const { rid } = await props.params;

  try {
    const reservation = await db.query.reservations.findMany({
      where: (reservations, { eq }) => eq(reservations.id, rid)
    });

    console.log("Fetched reservations:", reservation);

    return NextResponse.json(reservation, { status: 200 });

  } catch (error) {

    new Error("Error fetching reservations: " + error);

  }

}