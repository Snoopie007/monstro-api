import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function PUT(req: Request, props: { params: Promise<{ id: string, pid: number, lid: number }> }) {
    const params = await props.params;
    const session = await auth();
    const data = await req.json()
    try {

        if (session) {
            console.log(params)
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/program-level-update/${params.lid}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.user.token}`,
                    "locationId": `${params.id}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            console.log(res)
            if (!res.ok) {
                return NextResponse.json({ message: "An error occurred saving program level." }, { status: 400 });
            }
            return NextResponse.json({ message: "" }, { status: 200 });
        }
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string, pid: number, lid: number }> }) {
    const params = await props.params;
    const session = await auth();
    try {

        if (session) {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/program-level/${params.lid}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.user.token}`,
                    "locationId": `${params.id}`,
                    'Content-Type': 'application/json'
                }
            })
            if (!res.ok) {
                return NextResponse.json({ message: "An error occurred deleting program level." }, { status: 400 });
            }
            return NextResponse.json({ message: "" }, { status: 200 });
        }
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

