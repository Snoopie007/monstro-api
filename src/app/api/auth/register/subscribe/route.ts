import { NextResponse } from 'next/server';
import { auth } from "@/auth";

export async function POST(request: Request) {
    const session = await auth();
    const data = await request.json();
    const { plan, token, programId } = data;
    try {
        if (session) {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/member/program/plan/subscribe/${programId}/${plan.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.user.token}`,
                    "content-type": "application/json"
                },
                body: JSON.stringify({ plan, token })
            })
            if (!res.ok) {
                return NextResponse.json({ message: "Error getting plans." }, { status: 400 });
            }
            return NextResponse.json({ message: "Success" }, { status: 200 });
        }
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 })
    }
}
