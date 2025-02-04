
import { ColumnDef } from "@tanstack/react-table";
import { Transaction } from "@/types";


export const TransactionColumns = (locationId: string): ColumnDef<Transaction, any>[] => [

    {
        accessorKey: "item",
        header: "Item",
        id: "item"
    },
    {
        accessorKey: "description",
        header: "Description",
        id: "description",
        cell: ({ row }) => {

            const transaction = row.original
            return (
                <div className="flex flex-row items-center gap-2">
                    {transaction.description?.length > 100
                        ? transaction.description.slice(0, 97) + '...'
                        : transaction.description}
                </div>
            )
        },
    },
    {
        accessorKey: "amount",
        header: "Amount",
        id: "amount",
        cell: ({ row }) => {

            const transaction = row.original
            return (
                <div className="flex flex-row items-center gap-2">{transaction.amount}</div>
            )
        },
    },
    {
        accessorKey: "direction",
        header: "Direction",
        id: "direction",
    },
    {
        accessorKey: "paymentMethod",
        header: "Payment Method",
        id: "paymentMethod",
    },
    {
        accessorKey: "type",
        header: "Type",
        id: "type",
    },
    {
        accessorKey: "member",
        header: "Member",
        id: "member",
        cell: ({ row }) => {

            const transaction = row.original
            return (
                <div className="flex flex-row items-center gap-2">{transaction.member?.firstName} {transaction.member?.lastName}</div>
            )
        },
    },
    {
        accessorKey: "created",
        header: "Date",
        id: "created",
        cell: ({ row }) => {

            const transaction = row.original
            return (
                <div className="flex flex-row items-center gap-2">{transaction.created.toLocaleDateString()}</div>
            )

        },
    },
    {
        accessorKey: "status",
        header: "Status",
        id: "status",
    }

];
