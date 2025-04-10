
import { auth } from "@/auth";
import { db } from "@/db/db";
import { NextResponse, NextRequest } from "next/server";
import { subMonths } from "date-fns";
type ReportProps = {
    params: Promise<{ id: number }>
}

export async function GET(req: NextRequest, props: ReportProps) {
    const { id } = await props.params
    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get("type")
    const session = await auth();

    if (!type) {
        return NextResponse.json({ error: "Type is required" }, { status: 400 })
    }


    try {
        const report = await getReport(id, type)
        return NextResponse.json(report, { status: 200 })
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 })
    }
}



async function getReport(id: number, type: string) {
    switch (type) {
        case "members":
            return await newMemberReport(id)
        default:
            return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
    }
}

async function newMemberReport(id: number) {
    const members = await db.query.memberLocations.findMany({
        where: (memberLocations, { eq, and, gte }) => and(
            eq(memberLocations.locationId, id),
            eq(memberLocations.status, "active"),
            gte(memberLocations.created, subMonths(new Date(), 1))
        )
    })
    return members
}
