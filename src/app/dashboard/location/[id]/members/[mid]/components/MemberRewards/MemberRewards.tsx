'use client'
import { useEffect, useState } from 'react';
import { Input } from '@/components/forms';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui';
import { format } from 'date-fns';

export function MemberRewards({ params }: { params: { id: string; mid: string } }) {
    const [rewards, setRewards] = useState<Array<any>>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchRewards = async () => {
            try {
                const res = await fetch(`/api/protected/loc/${params.id}/rewards?id=${params.mid}`);
                if (res.ok) {
                    const data = await res.json();
                    setRewards(data);
                }
            } catch (error) {
                console.error('Failed to fetch rewards:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRewards();
    }, [params.id]);

    return (
        <div className='space-y-0'>
            <div className='w-full flex flex-row items-center px-4 py-2  bg-foreground/5  gap-2'>
                <Input placeholder='Search rewards...' className='w-auto bg-background border-foreground/10 h-9' />
            </div>

            <div className='border-y border-foreground/10'>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {['Reward', 'Description', 'Claim Date', ''].map((header, index) => (
                                <TableHead key={index} className='text-xs h-auto py-2'>
                                    {header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className='text-center py-4'>
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : rewards.length > 0 ? (
                            rewards.map((reward, i) => (
                                <TableRow key={i}>
                                    <TableCell>{reward.name}</TableCell>
                                    <TableCell>{reward.description}</TableCell>
                                    <TableCell>{format(new Date(reward.created), 'MMM d, yyyy')}</TableCell>
                                    <TableCell className='flex flex-row items-center'></TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className='text-center py-4'>
                                    No rewards found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
