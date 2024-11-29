
import { NextResponse } from 'next/server';
import { postRegister } from "@/libs/api"

export async function POST(req: Request) {
	try {
		const data = await req.json()
		const res = await postRegister({ url: `/member/register`, data: data });
		return NextResponse.json({ res }, { status: 200 });
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}