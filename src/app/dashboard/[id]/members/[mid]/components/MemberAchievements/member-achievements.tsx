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
import { useMemberAchievements } from '@/hooks/use-members'
import { formatDateTime } from '@/libs/utils'

const Dummy = [
    {}
]

export function MemberAchievements({ params }: { params: { id: string, mid: number } }) {
    const {achievements, error, isLoading} = useMemberAchievements(params.id, params.mid)
    console.log(achievements)
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

                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Points Earned</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {achievements.map((achievement: any, i: number) => (
                            <TableRow key={i}>

                                <TableCell>
                                    {achievement.achievement.name}
                                </TableCell>
                                <TableCell>
                                    {achievement.achievement.description}
                                </TableCell>
                                <TableCell>
                                    {achievement.achievement.points}
                                </TableCell>

                                <TableCell>
                                    {formatDateTime(achievement.dateAchieved, {
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
