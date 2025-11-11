import ErrorComponent from '@/components/error';
import { db } from "@/db/db";
import { TransactionsList } from "./components/TransactionsList";
import { TransactionProvider } from "./providers";

async function fetchTransactions(lid: string) {
    try {
        const transactions = await db.query.transactions.findMany({
            where: (transaction, { eq }) => eq(transaction.locationId, lid)
        });
        return transactions;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export default async function TransactionsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;

    const transactions = await fetchTransactions(params.id);

    if (!transactions) return <ErrorComponent error={new Error('Failed to fetch transactions')} />

    return (
        <TransactionProvider transactions={transactions}>
            <div className=' space-y-4 p-2'>
                <div className='border border-foreground/10 rounded-lg'>
                    <TransactionsList lid={params.id} />
                </div>
            </div>
        </TransactionProvider>
    )
}
