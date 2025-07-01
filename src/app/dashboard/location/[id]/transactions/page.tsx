

import { db } from "@/db/db";
import { TransactionsList } from "./components/TransactionsList";
import { Transaction } from "@/types";

async function fetchTransactions(id: string): Promise<Transaction[]> {
    try {
        const transactions = await db.query.transactions.findMany({
            where: (transaction, { eq }) => eq(transaction.locationId, id)
        })
        return transactions;
    } catch (error) {
        console.log("error", error);
        return [];
    }
}


export default async function Transactions(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const transactions = await fetchTransactions(params.id);

    return (
        <TransactionsList params={params} transactions={transactions} />
    );
}
