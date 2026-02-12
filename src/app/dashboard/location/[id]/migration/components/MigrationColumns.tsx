'use client'

import { MigrateMember } from '@subtrees/types/member'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui'
import { format } from 'date-fns'

const statusColorMap: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
}

export const MigrationColumns = (): ColumnDef<MigrateMember, any>[] => {
    return [
        {
            accessorKey: 'name',
            header: 'Name',
            id: 'name',
            cell: ({ row }) => {
                const migration = row.original
                return (
                    <div className="flex flex-row items-center gap-2">
                        <div className="size-8 rounded-full bg-foreground/5 flex items-center justify-center text-sm font-semibold">
                            {migration.firstName.charAt(0)}
                            {migration.lastName.charAt(0)}
                        </div>
                        <span className="text-sm font-medium whitespace-nowrap">
                            {migration.firstName} {migration.lastName}
                        </span>
                    </div>
                )
            },
        },
        {
            accessorKey: 'email',
            header: 'Email',
            cell: ({ row }) => {
                const migration = row.original
                return <span className="text-sm whitespace-nowrap">{migration.email}</span>
            },
        },
        {
            accessorKey: 'phone',
            header: 'Phone',
            cell: ({ row }) => {
                const migration = row.original
                return <span className="text-sm whitespace-nowrap">{migration.phone}</span>
            },
        },
        {
            accessorKey: 'pricing',
            header: 'Pricing',
            cell: ({ row }) => {
                const migration = row.original
                return (
                    <span className="text-sm whitespace-nowrap">
                        {migration.pricing ? migration.pricing?.name : '-'}
                    </span>
                )
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const migration = row.original
                const statusColor = statusColorMap[migration.status] || 'bg-gray-100 text-gray-800'
                return (
                    <Badge className={`${statusColor} capitalize whitespace-nowrap`}>
                        {migration.status}
                    </Badge>
                )
            },
        },
        {
            accessorKey: 'payment',
            header: 'Payment',
            cell: ({ row }) => {
                const migration = row.original
                return (
                    <Badge className={`whitespace-nowrap ${migration.payment ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {migration.payment ? 'Required' : 'Not Required'}
                    </Badge>
                )
            },
        },
        {
            accessorKey: 'viewedOn',
            header: 'Viewed',
            cell: ({ row }) => {
                const migration = row.original
                return (
                    <span className="text-sm whitespace-nowrap">
                        {migration.viewedOn ? format(new Date(migration.viewedOn), 'MMM dd, yyyy') : '-'}
                    </span>
                )
            },
        },
        {
            accessorKey: 'acceptedOn',
            header: 'Accepted',
            cell: ({ row }) => {
                const migration = row.original
                return (
                    <span className="text-sm whitespace-nowrap">
                        {migration.acceptedOn ? format(new Date(migration.acceptedOn), 'MMM dd, yyyy') : '-'}
                    </span>
                )
            },
        },
        {
            accessorKey: 'declinedOn',
            header: 'Declined',
            cell: ({ row }) => {
                const migration = row.original
                return (
                    <span className="text-sm whitespace-nowrap">
                        {migration.declinedOn ? format(new Date(migration.declinedOn), 'MMM dd, yyyy') : '-'}
                    </span>
                )
            },
        },
        {
            accessorKey: 'lastRenewalDay',
            header: () => <span className="whitespace-nowrap">Last Renewal</span>,
            cell: ({ row }) => {
                const migration = row.original
                return (
                    <span className="text-sm whitespace-nowrap">
						{migration.lastRenewalDay ? format(new Date(migration.lastRenewalDay), 'MMM dd, yyyy') : '-'}
                    </span>
                )
            },
        },
        {
            accessorKey: 'created',
            header: 'Created',
            cell: ({ row }) => {
                const migration = row.original
                return (
                    <span className="text-sm whitespace-nowrap">
                        {migration.created ? format(new Date(migration.created), 'MMM dd, yyyy') : '-'}
                    </span>
                )
            },
        },
    ]
}
