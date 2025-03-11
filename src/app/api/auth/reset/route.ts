
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	const data = await req.json()
	try {
		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err) {
		console.log(err)
		return NextResponse.json({ err }, { status: 500 })
	}
}