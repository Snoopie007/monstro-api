import { postRegister } from "@/libs/api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	const data = await req.json()
	try {
		console.log(123);
		console.log(data)
		const res = await postRegister({ url: `password/reset`, data: data });
		console.log(res)
		return NextResponse.json({ res }, { status: 200 });
	} catch (err) {
		console.log(err)
		return NextResponse.json({ err }, { status: 500 })
	}
}