
import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';

export async function GET(req: Request, props: { params: Promise<{ mid: number, id: number }> }) {
    const session = await auth();
    try {
        if (session) {


            return NextResponse.json({}, { status: 200 });
        }
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 })
    }
}