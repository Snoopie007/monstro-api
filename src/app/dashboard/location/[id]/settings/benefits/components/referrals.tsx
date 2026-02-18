'use client'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Vendor, VendorReferral } from '@subtrees/types'
import { CopyIcon } from 'lucide-react'

interface VendorReferralsProps {
    vendor: Vendor
}

export function VendorReferrals({ vendor }: VendorReferralsProps) {
    const referrals = vendor.referrals
    const pending = referrals?.filter((referral: VendorReferral) => referral.accepted === null).length

    return (
        <div className='space-y-4'>
            <div className='flex flex-col border border-foreground/10 rounded-sm px-4 '>
                <div className='flex flex-row items-center  border-b border-foreground/10 py-4 gap-6 text-sm justify-start'>
                    <div className='flex flex-row items-center justify-center gap-1'>
                        <span className='text-muted-foreground '>Pending: </span>
                        <span className='text-foreground'>{pending} </span>
                    </div>
                    {/* <div className='flex flex-row items-center justify-center gap-1'>
                        <span className='text-muted-foreground '>Total received: </span>
                        <span className='text-foreground'>${vendor.credits}</span>
                    </div>
                    <div className='flex flex-row items-center justify-center gap-1'>
                        <span className='text-muted-foreground '>Spended: </span>
                        <span className='text-foreground'>${vendor.spendedCredits}</span>
                    </div>
                    <div className='flex flex-row items-center justify-center gap-1'>
                        <span className='text-muted-foreground '>Balance: </span>
                        <span className='text-foreground'>${vendor.credits - vendor.spendedCredits}</span>
                    </div> */}
                </div>
                <div className='flex flex-row items-center justify-start gap-2 py-4'>
                    <div>
                        <Button variant="foreground" size="xs" className='w-full'>
                            Invite a friend
                        </Button>
                    </div>
                    <div className='flex flex-col space-y-1 '>

                        <div className='bg-white/10 rounded-sm px-3 py-1 flex items-center gap-2'>
                            <span className='text-sm font-bold'>WX34L</span>
                            <Button size={'icon'} variant={'ghost'} onClick={() => navigator.clipboard.writeText('WX34L')} className='h-auto leading-none'>
                                <CopyIcon size={16} />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            <div className='border border-foreground/10 rounded-sm'>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            {["Name", "Invited at", "Joined at", "Credit amount", "Status"].map((item, index) => (
                                <TableHead key={index} className="h-auto py-2 ">{item}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {referrals && referrals.map((referral, index) => (
                            <TableRow key={index}>
                                <TableCell>{referral.referred?.firstName} {referral.referred?.lastName}</TableCell>
                                <TableCell>{referral.created.toLocaleDateString()}</TableCell>
                                <TableCell>{referral.accepted ? referral.accepted.toLocaleDateString() : 'Pending'}</TableCell>
                                <TableCell>{referral.amount}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

