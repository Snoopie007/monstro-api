import { Icon } from '@/components/icons'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    Button,
} from '@/components/ui'
import { useState } from 'react'
import { toast } from 'react-toastify'
import { Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'

interface MemberSubscriptionActionsProps {
    subscription?: {
        id: number
        plan: string
        status: string
    } | null
}

export default function MemberSubscriptionActions({ subscription }: MemberSubscriptionActionsProps) {
    const [loading, setLoading] = useState(false)
    const params = useParams()
    const locationId = params?.lid
    const memberId = params?.mid

    async function onCancel() {
        if (!subscription?.id) {
            toast.error('No subscription selected')
            return
        }

        if (!locationId || !memberId) {
            toast.error('Missing location or member information')
            return
        }

        setLoading(true)
        try {
            const response = await fetch(
                `/api/loc/${locationId}/member/${memberId}/subscriptions`, 
                {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subscriptionId: subscription.id })
                }
            )

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to cancel subscription')
            }

            toast.success('Subscription cancelled successfully')
            // Optionally refresh data here or use a callback
        } catch (error) {
            toast.error((error instanceof Error ? error.message : 'An unknown error occurred'))
        } finally {
            setLoading(false)
        }
    }


    return (
        <div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant={'ghost'} className='h-auto py-0 px-0 hover:bg-transparent'>
                        <Icon name="EllipsisVertical" size={16} className="dark:text-white" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className='w-[180px] border-foreground/20 p-2'>
                    <DropdownMenuItem
                        className='cursor-pointer bg-red-500 text-white hover:bg-red-600'
                        onClick={onCancel}
                        disabled={loading || !subscription}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin mr-2" />
                                Cancelling...
                            </>
                        ) : (
                            'Cancel Subscription'
                        )}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}