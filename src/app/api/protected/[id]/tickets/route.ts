import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    const newTicket = await req.json()
    try {
        const user = await auth();

        if (user) {
            const res = await fetch(`http://localhost:3001/api/tickets/${newTicket.ticketId}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.MONSTRO_API_KEY}`,
                },
                body: JSON.stringify(newTicket)
            })
            return NextResponse.json({ res }, { status: 200 });
        }
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}