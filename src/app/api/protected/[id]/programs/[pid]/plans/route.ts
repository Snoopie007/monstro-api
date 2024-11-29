
import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';


export async function GET(req: Request, props: { params: Promise<{ pId: number, id: number }> }) {
    const params = await props.params;
    const session = await auth();
    try {
        if (session) {

            const plans = db.query.plans.findMany({
                where: (plans, { eq }) => eq(plans.programId, params.pId),
            });
            console.log(plans)
            return NextResponse.json(plans, { status: 200 });
        }
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 })
    }
}


export async function POST(req: Request, props: { params: Promise<{ id: string, pId: number }> }) {
    const params = await props.params;
    const session = await auth();
    const data = await req.json()
    try {
        if (session) {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/add-stripe-plan/${params.pId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.user.token}`,
                    "locationId": `${params.id}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                return NextResponse.json({ message: "An error occurred saving plan." }, { status: 400 });
            }
            const response = await res.json();
            return NextResponse.json(response, { status: 200 });
        }
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}