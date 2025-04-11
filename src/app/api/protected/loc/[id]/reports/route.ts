import { db } from "@/db/db";
import { NextResponse, NextRequest } from "next/server";
import {
    recentCancelledMembers,
    topSpenders,
    mltv,
    newMembersByMonth,
    revenueData,
    recurringRevenueData
} from "./utils";


type ReportProps = {
    params: Promise<{ id: number }>
}


export async function GET(req: NextRequest, props: ReportProps) {
    const { id } = await props.params


    try {
        const transactions = await db.query.transactions.findMany({
            where: (transactions, { eq, and }) => and(
                eq(transactions.locationId, id),
                eq(transactions.status, 'paid'),
            )
        });

        const members = await db.query.memberLocations.findMany({
            where: (memberLocations, { eq }) => eq(memberLocations.locationId, id),
            with: {
                member: true
            }
        });


        return NextResponse.json({
            transactions,
            revenueData: revenueData(transactions),
            recurringRevenueData: recurringRevenueData(transactions),
            recentCancelledMembers: recentCancelledMembers(members),
            newMembersByMonth: newMembersByMonth(members),
            topSpenders: topSpenders(transactions, members),
            mltv: mltv(transactions)
        }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 });
    }
}
