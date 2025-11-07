import { NextRequest, NextResponse } from "next/server";

type Props = {
    params: Promise<{
        id: string;
        mid: string;
        pkid: string;
    }>
}
export async function PATCH(req: NextRequest, props: Props) {
    const { id, mid, pkid } = await props.params;
    try {


        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error }, { status: 500 });
    }
}