'use client'
import { Input } from '@/components/forms'
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
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
    const { mas, error, isLoading } = useMemberAchievements(params.id, params.mid)

    return (
        <div className='space-y-2'>
            <div className='w-full flex flex-row items-center px-4 py-2  bg-foreground/5  gap-2'>
                <Input placeholder='Search rewards...' className='w-auto bg-background border-foreground/10 h-9' />
            </div>
            <div className='border-y border-foreground/10'>
                <Table className=''>
                    <TableHeader>
                        <TableRow>
                            {['Name', 'Description', 'Points Earned', 'Date'].map((header, index) => (
                                <TableHead key={index} className='text-sm h-auto py-2'>{header}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mas && mas.length > 0 ? (
                            <>
                                {mas.map((ma, i: number) => (
                                    <TableRow key={i}>

                                        <TableCell>
                                            <div className='flex flex-row items-center gap-2'>
                                                <Avatar>
                                                    <AvatarImage src={ma.achievement?.badge} />
                                                    <AvatarFallback>
                                                        {ma.achievement?.name?.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className='text-sm'>
                                                    {ma.achievement?.name}
                                                </div>
                                            </div>

                                        </TableCell>
                                        <TableCell>
                                            {ma.achievement?.description}
                                        </TableCell>
                                        <TableCell>
                                            {ma.achievement?.awardedPoints}
                                        </TableCell>

                                        <TableCell>
                                            {format(ma.dateAchieved, 'MMM d, yyyy')}
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
