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
import { useMemberAchievements } from '@/hooks/hooks'
import { format } from 'date-fns'
export function MemberAchievements({ params }: { params: { id: string, mid: number } }) {
    const { achievements, error, isLoading } = useMemberAchievements(params.id, params.mid)

    return (
        <div className='py-4'>
            <div className='w-full flex flex-row items-center  justify-between'>
                <div className='flex-initial'>
                    <Input placeholder='Filter' className='w-[250px] h-auto py-2 rounded-sm' />
                </div>

            </div>
            <div className='border rounded-xs mt-4'>
                <Table className=''>
                    <TableHeader>
                        <TableRow>
                            {['Name', 'Description', 'Points Earned', 'Date', ''].map((header, index) => (
                                <TableHead key={index} className='text-sm h-auto py-2'>{header}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {achievements && achievements.length > 0 ? (
                            <>
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
                                            {format(achievement.dateAchieved, 'MMM d, yyyy')}
                                        </TableCell>

                                        <TableCell className='flex flex-row items-center'>

                                        </TableCell>
                                    </TableRow>
                                ))}
                            </>
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className='text-center text-sm text-foreground/50'>
                                    No achievements found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
