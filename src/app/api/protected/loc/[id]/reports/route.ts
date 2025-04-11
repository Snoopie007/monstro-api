
import { db } from "@/db/db";
import { NextResponse, NextRequest } from "next/server";
import { getRecentCancelledMembers, getTopCustomersBySpend } from "./utils";
import { getRevenueData } from "./utils";
import { getRecurringRevenueData } from "./utils";
import { getNewMembersByMonth } from "./utils";

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

        const newMembersByMonth = getNewMembersByMonth(members)
        const topCustomersBySpend = getTopCustomersBySpend(transactions, members)

        return NextResponse.json({
            transactions,
            revenueData: getRevenueData(transactions),
            recurringRevenueData: getRecurringRevenueData(transactions),
            recentCancelledMembers: getRecentCancelledMembers(members),
            newMembersByMonth,
            topCustomersBySpend
        }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 });
    }
}
