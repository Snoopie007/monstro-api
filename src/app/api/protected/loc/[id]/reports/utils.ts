import { Transaction } from "@/types/transaction";
import { MemberLocation, MemberSubscription } from "@/types/member";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// function recentCancelledMembers(
//   memberSubscriptions: MemberSubscription[],
//   startDate?: Date,
//   endDate?: Date
// ) {
//   return memberSubscriptions
//     .filter((ms) => {
//       // Filter by status
//       const isCancelled = ms.status === "canceled" || ms.endedAt !== null;
//       if (!isCancelled) return false;

//       // Filter by date range if provided
//       if (startDate || endDate) {
//         // Use endedAt for cancelled subscriptions, fallback to updated/created
//         const cancelDate = ms.endedAt || ms.updated || ms.created;
//         if (!cancelDate) return false;

//         const cancelTimestamp = new Date(cancelDate).getTime();

//         if (startDate && cancelTimestamp < startDate.getTime()) return false;
//         if (endDate && cancelTimestamp > endDate.getTime()) return false;
//       }

//       return true;
//     })
//     .sort((a, b) => {
//       // Sort by endedAt if available, otherwise by updated/created date
//       const aDate = a.endedAt || a.updated || a.created;
//       const bDate = b.endedAt || b.updated || b.created;
//       return new Date(bDate).getTime() - new Date(aDate).getTime();
//     })
//     .slice(0, 10)
//     .map((ms) => ({
//       id: ms.memberId,
//       ...ms.member,
//       cancelledDate: ms.endedAt || ms.updated || ms.created,
//       subscriptionId: ms.id,
//       status: ms.status,
//     }));
// }

// function newMembersByMonth(memberLocations: MemberLocation[]) {
//   // Initialize counts for each month
//   const counts = Object.fromEntries(months.map((month) => [month, 0]));

//   memberLocations.forEach((ml) => {
//     if (ml.created) {
//       const date = new Date(ml.created);
//       // Get the correct month index and use it to get the month name
//       const monthIndex = date.getMonth();
//       const month = months[monthIndex];
//       counts[month]++;
//     }
//   });

//   return months.map((month) => ({ month, count: counts[month] }));
// }


// function topSpenders(transactions: Transaction[], mls: MemberLocation[]) {
//   // Using Map instead of object for better type safety and performance
//   const memberTotals = new Map<string, number>();

//   // Sum up transaction amounts by member
//   transactions.forEach((tx) => {
//     if (!tx.memberId) return;
//     const currentTotal = memberTotals.get(tx.memberId) || 0;
//     memberTotals.set(tx.memberId, currentTotal + (tx.amount / 100 || 0));
//   });

//   // Get top 10 spenders with member info
//   return Array.from(memberTotals.entries())
//     .map(([id, amount]) => ({
//       ...mls.find((m) => m.memberId === id)?.member,
//       totalAmount: amount,
//     }))
//     .sort((a, b) => b.totalAmount - a.totalAmount)
//     .slice(0, 10);
// }

// function revenueData(transactions: Transaction[]) {
//   const revenueByMonth = Object.fromEntries(months.map((month) => [month, 0]));

//   transactions.forEach((transaction) => {
//     if (transaction.status === "paid" && !transaction.refunded) {
//       const month = months[new Date(transaction.created as Date).getMonth()];
//       revenueByMonth[month] += transaction.amount / 100;
//     }
//   });

//   return months.map((month) => ({ month, amount: revenueByMonth[month] }));
// }

// function recurringRevenueData(transactions: Transaction[]) {
//   const recurringRevenueByMonth = Object.fromEntries(
//     months.map((month) => [month, 0])
//   );

//   transactions.forEach((transaction) => {
//     if (transaction.status === "paid" && !transaction.refunded) {
//       const month = months[new Date(transaction.created as Date).getMonth()];
//       recurringRevenueByMonth[month] += transaction.amount / 100;
//     }
//   });

//   return months.map((month) => ({
//     month,
//     amount: recurringRevenueByMonth[month],
//   }));
// }
// function mltv(transactions: Transaction[]) {
//   // Group transactions by member and month
//   const memberMonthlyTotals = new Map<string, Map<string, number>>();

//   // Process each transaction
//   transactions.forEach((tx) => {
//     if (!tx.memberId || !tx.created || tx.refunded) return;

//     // Get or create member map
//     if (!memberMonthlyTotals.has(tx.memberId)) {
//       memberMonthlyTotals.set(tx.memberId, new Map());
//     }

//     const memberMap = memberMonthlyTotals.get(tx.memberId)!;
//     const month = months[new Date(tx.created).getMonth()];
//     const currentAmount = memberMap.get(month) || 0;
//     memberMap.set(month, currentAmount + tx.amount / 100);
//   });

//   // Calculate median LTV for each month
//   return months.map((month) => {
//     // Get all non-zero values for this month
//     const values = Array.from(memberMonthlyTotals.values())
//       .map((memberMap) => memberMap.get(month) || 0)
//       .filter((amount) => amount > 0);

//     let median = 0;
//     if (values.length > 0) {
//       values.sort((a, b) => a - b);
//       const mid = Math.floor(values.length / 2);
//       median =
//         values.length % 2 === 0
//           ? (values[mid - 1] + values[mid]) / 2
//           : values[mid];
//     }

//     return { month, amount: median };
//   });
// }
