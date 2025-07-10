import { db } from "@/db/db";
import { NextResponse, NextRequest } from "next/server";
import {
  recentCancelledMembers,
  topSpenders,
  mltv,
  newMembersByMonth,
  revenueData,
  recurringRevenueData,
} from "./utils";
import { and, eq, gte, lte, SQL, or, isNotNull } from "drizzle-orm";
import {
  transactions,
  memberLocations,
  memberSubscriptions,
} from "@/db/schemas";

type ReportProps = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, props: ReportProps) {
  const { id } = await props.params;
  const { searchParams } = new URL(req.url);

  // Extract date parameters
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  let startDate: Date | undefined;
  let endDate: Date | undefined;

  // Parse and validate dates
  if (startDateParam) {
    startDate = new Date(startDateParam);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD)" },
        { status: 400 }
      );
    }
  }

  if (endDateParam) {
    endDate = new Date(endDateParam);
    if (isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);
  }

  try {
    // Build transaction filter conditions
    const transactionConditions: SQL[] = [
      eq(transactions.locationId, id),
      eq(transactions.status, "paid"),
    ];

    if (startDate) {
      transactionConditions.push(gte(transactions.created, startDate));
    }

    if (endDate) {
      transactionConditions.push(lte(transactions.created, endDate));
    }

    const transactionResults = await db.query.transactions.findMany({
      where: () => and(...transactionConditions),
    });

    // Build member filter conditions for memberLocations
    const memberConditions: SQL[] = [eq(memberLocations.locationId, id)];

    if (startDate) {
      memberConditions.push(gte(memberLocations.created, startDate));
    }

    if (endDate) {
      memberConditions.push(lte(memberLocations.created, endDate));
    }

    const members = await db.query.memberLocations.findMany({
      where: () => and(...memberConditions),
      with: {
        member: true,
      },
    });

    // Get all cancelled subscriptions for this location
    const cancelledSubscriptions = await db.query.memberSubscriptions.findMany({
      where: (ms, { eq, or, isNotNull }) =>
        and(
          eq(ms.locationId, id),
          or(eq(ms.status, "canceled"), isNotNull(ms.endedAt))
        ),
      with: {
        member: true,
      },
    });

    //   TODO: temporary fix for type error
    const typedTransactions = transactionResults.map((transaction) => ({
      ...transaction,
      items: transaction.items as unknown as Record<string, unknown>[],
    }));

    return NextResponse.json(
      {
        transactions: typedTransactions,
        revenueData: revenueData(typedTransactions),
        recurringRevenueData: recurringRevenueData(typedTransactions),
        recentCancelledMembers: recentCancelledMembers(
          cancelledSubscriptions,
          startDate,
          endDate
        ),
        newMembersByMonth: newMembersByMonth(members),
        topSpenders: topSpenders(typedTransactions, members),
        mltv: mltv(typedTransactions),
        dateRange: {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching reports:", err);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
