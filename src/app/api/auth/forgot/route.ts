
import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ err }, { status: 500 })
  }
}