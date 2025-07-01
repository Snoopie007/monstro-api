'use client'
import {
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui'
import { Input } from '@/components/forms'
import { formatAmountForDisplay } from '@/libs/utils'
import { useMemberPackages } from '@/hooks'

import { format } from 'date-fns'
import { MemberPackage } from '@/types/member'
import { CreatePackage } from './CreatePkg/CreatePackage'
import { Badge } from '@/components/ui'

export function MemberPackages({ params }: { params: { id: string, mid: string } }) {
    const { packages, isLoading } = useMemberPackages(params.id, params.mid)

    return (
        <div className='space-y-0'>
            <div className='w-full flex flex-row items-center px-4 py-2  bg-foreground/5  gap-2'>
                <Input placeholder='Search packages...' className='w-auto bg-background border-foreground/10 h-9' />
                <CreatePackage params={params} />
            </div>
            <div className='border-y border-foreground/10'>
                <Table className=''>
                    <TableHeader>
                        <TableRow>
                            {['Plan', 'Start Date', 'Amount', 'Attended', 'Remaining', 'Expire Date', 'Status'].map((header, i) => (

                                <TableHead key={i} className='text-sm font-normal h-auto  py-2'>{header}</TableHead>

                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                {Array.from({ length: 7 }).map((_, i) => (
                                    <TableCell key={i}>
                                        <Skeleton className="w-full h-4 bg-gray-100" />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ) : packages?.length > 0 ? (
                            packages.map((p: MemberPackage) => (
                                <TableRow key={p.id}>
                                    <TableCell>{p.plan?.name}</TableCell>
                                    <TableCell>
                                        {format(p.startDate, 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell>
                                        {formatAmountForDisplay((p.plan?.price || 0) / 100, p.plan?.currency || 'USD')}
                                    </TableCell>
                                    <TableCell>
                                        {p.totalClassAttended}
                                    </TableCell>
                                    <TableCell>
                                        {p.totalClassLimit - (p.totalClassAttended ?? 0)}
                                    </TableCell>
                                    <TableCell>
                                        {p.expireDate ? format(p.expireDate, 'MMM d, yyyy') : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge pkg={p.status} size={"tiny"}>{p.status}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {/* Actions would go here */}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center">
                                    No packages found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
