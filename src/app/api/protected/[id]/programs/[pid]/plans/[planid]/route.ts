
import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';

export async function PUT(req: Request, props: { params: Promise<{ id: string, pid: number, planid: number }> }) {
    const params = await props.params;
    const session = await auth();
    const data = await req.json()
    try {
        if (session) {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/update-member-plan/${params.pid}/${params.planid}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.user.token}`,
                    "locationId": `${params.id}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            console.log(res)
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