

import { decodeId } from "@/libs/server/sqids";
import { db } from "@/db/db";
import { TransactionsList } from "./components/TransactionsList";
import { Transaction } from "@/types";

async function fetchTransactions(id: string): Promise<Transaction[]> {
    const decodedId = decodeId(id);
    try {
        const transactions = await db.query.transactions.findMany({
            where: (transaction, { eq }) => eq(transaction.locationId, decodedId)
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

    )
}
