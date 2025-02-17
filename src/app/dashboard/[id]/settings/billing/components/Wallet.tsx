'use client'
import { Button, Card, CardContent, CardHeader, CardTitle, Separator } from '@/components/ui'
import { VendorWallet } from '../data'
import React from 'react'
import { formatAmountForDisplay } from '@/libs/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/forms'


interface WalletProps {
    wallet: VendorWallet
}

export default function Wallet({ wallet }: WalletProps) {

    return (
        <Card className=''>
            <CardHeader className='border-b p-0 space-y-0 flex flex-row justify-between'>
                <CardTitle className='text-sm py-2 px-4'>Your Credit Balance</CardTitle>
                <Button variant={"ghost"} size={"sm"} className="border-l rounded-none cursor-pointer">
                    + Funds
                </Button>
            </CardHeader>
            <CardContent className=' p-2 space-y-2'>
                <div className='space-y-2 p-2'>
                    <div className="flex text-xs flex-row justify-between">
                        <div className=''>Balance</div>
                        <div className=' font-bold'>
                            {formatAmountForDisplay(wallet.balance, 'USD', true, 2)}
                        </div>
                    </div>
                    <div className="flex text-xs flex-row justify-between">
                        <div className=''>Complimentary Credits</div>
                        <div className=' font-bold'>
                            {formatAmountForDisplay(wallet.credits, 'USD', true, 2)}
                        </div>
                    </div>

                    <Separator className='my-2 bg-foreground/10' />

                    <div className='flex flex-row justify-between text-sm'  >
                        <div>
                            Total
                        </div>
                        <div className='font-bold text-indigo-500'>
                            {formatAmountForDisplay(wallet.balance + wallet.credits, 'USD', true, 2)}
                        </div>
                    </div>
                </div>
                <AutoRecharge wallet={wallet} />
            </CardContent>

        </Card>
    )
}


function AutoRecharge({ wallet }: { wallet: VendorWallet }) {

    return (
        <div className='text-sm  space-y-2 bg-foreground/10 py-3 px-2 rounded-xs'>
            <div className='text-xs font-medium border-b pb-2 border-foreground/10'>Auto Recharge Settings</div>
            <div className='grid grid-cols-2 gap-4 text-xs'>

                <div className='flex flex-col gap-1'>

                    <span className='font-medium '>Amount</span>
                    <Select value={`${wallet.rechargeAmount}`} defaultValue={"10"} onValueChange={(value) => {

                    }}>
                        <SelectTrigger className=' w-full h-auto border-none bg-indigo-500 text-white text-xs py-1 px-2 rounded-xs'>
                            <SelectValue className='text-sm' />
                        </SelectTrigger>
                        <SelectContent >
                            {[10, 15, 25, 50, 100, 250, 500, 1000].map((amount) => (
                                <SelectItem key={amount} value={amount.toString()} className='text-sm'>
                                    ${amount}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                </div>
                <div className='flex flex-col  gap-1'>
                    <span className='font-medium '>Threshold</span>
                    <Select value={`${wallet.rechargeThreshold}`} defaultValue={"10"} onValueChange={(value) => {

                    }}>
                        <SelectTrigger className='w-full h-auto border-none py-1 px-2  bg-indigo-500 text-white text-xs rounded-xs'>
                            <SelectValue className='text-sm' />
                        </SelectTrigger>
                        <SelectContent >
                            {[10, 25, 50, 75, 100, 250, 500].map((amount) => (
                                <SelectItem key={amount} value={amount.toString()} className='text-sm'>
                                    ${amount}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

        </div>
    )
}
