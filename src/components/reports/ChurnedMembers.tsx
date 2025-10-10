'use client'
import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { tryCatch } from '@/libs/utils'
import { MemberSubscription } from '@/types'



const DummyData: any[] = [
    {
        id: '1',
        member: {
            id: '1',
            firstName: 'John',
            lastName: 'Smith',
            updated: new Date('2024-01-15')
        } as any,
        plan: {
            id: '1',
            name: 'Premium Membership'
        } as any
    },
    {
        id: '2',
        member: {
            id: '2',
            firstName: 'Sarah',
            lastName: 'Johnson',
            updated: new Date('2024-01-10')
        } as any,
        plan: {
            id: '2',
            name: 'Basic Plan'
        } as any
    },
    {
        id: '3',
        member: {
            id: '3',
            firstName: 'Mike',
            lastName: 'Davis',
            updated: new Date('2024-01-08')
        } as any,
        plan: {
            id: '3',
            name: 'Gold Membership'
        } as any
    }
]

export function ChurnedMembers({ lid }: { lid: string }) {
    const [loading, setLoading] = useState(false)
    const [list, setList] = useState<MemberSubscription[]>([])

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        if (lid === 'acc_Kx9mN2pQ8vR4tL6wE3yZ5s') {
            setLoading(true)
            // Simulate loading delay for dummy data
            setTimeout(() => {
                setList(DummyData as MemberSubscription[])
                setLoading(false)
            }, 500)
            return
        }

        setLoading(true)
        const { result, error } = await tryCatch(fetch(`/api/protected/loc/${lid}/reports/cancels`))
        if (error || !result) return
        const data = await result.json()
        setList(data)
        setLoading(false)
    }

    return (
        <Card className='bg-foreground/5 rounded-lg border-foreground/10 p-0'>
            <CardHeader className='flex flex-row justify-between items-center' >
                <CardTitle className='text-lg font-semibold'>
                    Recent Cancelled Members
                </CardTitle>
            </CardHeader >
            <CardContent className='space-y-2 relative'>
                {loading ? (
                    <div className='flex flex-row gap-2 items-center justify-center h-[200px]'>
                        <Loader2 className='animate-spin' size={16} /> Loading data...
                    </div>
                ) : list.length === 0 ? (
                    <div className='flex flex-col gap-2 text-sm text-center text-muted-foreground py-2'>
                        No recent cancellations
                    </div>
                ) : (
                    <div className='flex flex-col gap-2 space-y-2'>
                        {list.map((sub) => (
                            <ChurnedMembersItem key={sub.id} sub={sub} />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}


function ChurnedMembersItem({ sub }: { sub: MemberSubscription }) {
    const { member } = sub
    return (
        <div className='flex flex-row justify-between items-center'>
            <div className='space-y-0'>
                <div className='text-base font-semibold'>{member?.firstName} {member?.lastName}</div>
                <div className='text-sm text-muted-foreground'>{sub.plan?.name}</div>
            </div>
            <div className='space-y-0 text-right'>
                <div className='text-xs text-muted-foreground'>Cancelled on</div>
                <div className='text-base font-semibold'>{format(member?.updated || new Date(), 'MMM d, yyyy')}</div>
            </div>

        </div>
    )
}