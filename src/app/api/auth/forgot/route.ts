import { postRegister } from "@/libs/api";
import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const res = await postRegister({url: `password/forgot`, data: data  });
    return NextResponse.json({res}, { status: 200 });
  } catch (err) {
    return NextResponse.json({err}, { status: 500 })
  }
}