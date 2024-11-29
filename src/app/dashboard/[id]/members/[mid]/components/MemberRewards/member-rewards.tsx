'use client'
import { Input } from '@/components/forms'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui'
import { formatDateTime } from '@/libs/utils'

const Dummy = [
    {}
]

export function MemberRewards({ params }: { params: { id: string, mid: number } }) {
    return (
        <div className='py-4'>
            <div className='w-full flex flex-row items-center  justify-between'>
                <div className='flex-initial'>
                    <Input placeholder='Filter' className='w-[250px] h-auto py-2 rounded-sm' />
                </div>

            </div>
            <div className='border rounded-sm mt-4'>
                <Table className=''>
                    <TableHeader>
                        <TableRow>

                            <TableHead>Reward</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Claim Date</TableHead>

                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Dummy.map((reward: any, i) => (
                            <TableRow key={i}>

                                <TableCell>
                                    {reward.name}
                                </TableCell>
                                <TableCell>
                                    {reward.description}
                                </TableCell>


                                <TableCell>
                                    {formatDateTime(reward.created, {
                                        month: 'short',
                                        day: 'numeric',

                                        hour: 'numeric',
                                        minute: 'numeric'
                                    })}
                                </TableCell>

                                <TableCell className='flex flex-row items-center'>

                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
