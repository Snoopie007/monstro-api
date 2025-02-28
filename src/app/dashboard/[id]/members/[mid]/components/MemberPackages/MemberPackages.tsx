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
import { cn, formatAmountForDisplay } from '@/libs/utils'

// import NewMemberTransaction from './CreateTransaction'
import { useMemberPackages } from '@/hooks'

import { format } from 'date-fns'
import { MemberPackage } from '@/types/member'
import { CreatePackage } from './CreatePackage'
import { Badge } from '@/components/ui'

export function MemberPackages({ params }: { params: { id: string, mid: number } }) {
    const { packages, isLoading } = useMemberPackages(params.id, params.mid)

    return (
        <div className='py-4 space-y-4'>
            <div className='w-full flex flex-row items-center  gap-2'>
                <div className='flex-initial'>
                    <Input placeholder='Search packages...' className='w-[250px] text-xs h-8 py-2 rounded-sm' />
                </div>
                <div>
                    <CreatePackage params={params} />
                </div>
            </div>
            <div className='border rounded-sm'>
                <Table className=''>
                    <TableHeader>
                        <TableRow>
                            {['Plan', 'Duration', 'Amount', 'Attended', 'Remaining', 'Expire Date', 'Status'].map((header, i) => (

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
                                        {format(p.startDate, 'MMM d, yyyy')} - {p.endDate ? format(p.endDate, 'MMM d, yyyy') : 'Never'}
                                    </TableCell>
                                    <TableCell>
                                        {formatAmountForDisplay((p.plan?.price || 0) / 100, p.plan?.currency || 'USD')}
                                    </TableCell>
                                    <TableCell>
                                        {p.totalClassAttended}
                                    </TableCell>
                                    <TableCell>
                                        {p.totalClassLimit - p.totalClassAttended}
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
