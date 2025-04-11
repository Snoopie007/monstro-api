import { Transaction } from "@/types/transaction";
import { MemberLocation, Member } from "@/types/member";



const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

function getRecentCancelledMembers(memberLocations: MemberLocation[]) {
    return memberLocations
        .filter(ml => ml.status === 'canceled')
        .sort((a, b) => new Date(b.updated || b.created).getTime() - new Date(a.updated || a.created).getTime())
        .slice(0, 10)
        .map(ml => ({
            id: ml.memberId,
            ...ml.member,
            created: ml.created,
            status: ml.status
        }));
}

function getNewMembersByMonth(memberLocations: MemberLocation[]) {
    // Initialize counts for each month
    const counts = Object.fromEntries(months.map(month => [month, 0]));

    memberLocations.forEach(ml => {
        if (ml.created) {
            const date = new Date(ml.created);
            // Get the correct month index and use it to get the month name
            const monthIndex = date.getMonth();
            const month = months[monthIndex];
            counts[month]++;
        }
    });


    return months.map(month => ({ month, count: counts[month] }));
}
function getTopCustomersBySpend(transactions: Transaction[], mls: MemberLocation[]) {
    // Using Map instead of object for better type safety and performance
    const memberTotals = new Map<number, number>();

    // Sum up transaction amounts by member
    transactions.forEach(tx => {
        if (!tx.memberId) return;
        const currentTotal = memberTotals.get(tx.memberId) || 0;
        memberTotals.set(tx.memberId, currentTotal + ((tx.amount / 100) || 0));
    });

    // Get top 10 spenders with member info
    return Array.from(memberTotals.entries())
        .map(([id, amount]) => ({
            ...mls.find(m => m.memberId === id)?.member,
            totalAmount: amount
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 10);
}

function getRevenueData(transactions: Transaction[]) {


    const revenueByMonth = Object.fromEntries(months.map(month => [month, 0]));

    transactions.forEach(transaction => {
        if (transaction.status === 'paid' && !transaction.refunded) {
            const month = months[new Date(transaction.created as Date).getMonth()];
            revenueByMonth[month] += transaction.amount / 100;
        }
    });

    return months.map(month => ({ month, revenue: revenueByMonth[month] }));
}

function getRecurringRevenueData(transactions: Transaction[]) {

    const recurringRevenueByMonth = Object.fromEntries(months.map(month => [month, 0]));

    transactions.forEach(transaction => {
        if (transaction.status === 'paid' && !transaction.refunded && transaction.paymentType === 'recurring') {
            const month = months[new Date(transaction.created as Date).getMonth()];
            recurringRevenueByMonth[month] += transaction.amount / 100;
        }
    });

    return months.map(month => ({ month, amount: recurringRevenueByMonth[month] }));
}

export {
    getRecentCancelledMembers,
    getNewMembersByMonth,
    getRevenueData,
    getRecurringRevenueData,
    getTopCustomersBySpend
};
