import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: number, pid: number }> }) {
    const { id, pid } = await params;
    return NextResponse.json({ id, pid });
}