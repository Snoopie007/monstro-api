import {db} from "@/db/db";
import {NextResponse, NextRequest} from "next/server";
import {
  recentCancelledMembers,
  topSpenders,
  mltv,
  newMembersByMonth,
  revenueData,
  recurringRevenueData,
} from "./utils";

type ReportProps = {
  params: Promise<{id: number}>;
};

export async function GET(req: NextRequest, props: ReportProps) {
  const {id} = await props.params;

  try {
    const transactions = await db.query.transactions.findMany({
      where: (transactions, {eq, and}) =>
        and(eq(transactions.locationId, id), eq(transactions.status, "paid")),
    });

    //   TODO: temporary fix for type error
    const typedTransactions = transactions.map((transaction) => ({
      ...transaction,
      items: transaction.items as unknown as Record<string, unknown>[],
    }));

    const members = await db.query.memberLocations.findMany({
      where: (memberLocations, {eq}) => eq(memberLocations.locationId, id),
      with: {
        member: true,
      },
    });

    return NextResponse.json(
      {
        transactions: typedTransactions,
        revenueData: revenueData(typedTransactions),
        recurringRevenueData: recurringRevenueData(typedTransactions),
        recentCancelledMembers: recentCancelledMembers(members),
        newMembersByMonth: newMembersByMonth(members),
        topSpenders: topSpenders(typedTransactions, members),
        mltv: mltv(typedTransactions),
      },
      {status: 200}
    );
  } catch (err) {
    return NextResponse.json({error: err}, {status: 500});
  }
}
