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
export function MemberAchievements({ params }: { params: { id: string, mid: string } }) {
    const { achievements, error, isLoading } = useMemberAchievements(params.id, params.mid)

    return (
        <div className='space-y-2'>
            <div className='w-full flex flex-row items-center px-4 py-2  bg-foreground/5  gap-2'>
                <Input placeholder='Search rewards...' className='w-auto bg-background border-foreground/10 h-9' />
            </div>
            <div className='border-y border-foreground/10'>
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
