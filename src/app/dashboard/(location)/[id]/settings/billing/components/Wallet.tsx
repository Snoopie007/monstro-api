'use client'
import {
    Button, Card, CardContent, CardHeader, CardTitle, Dialog,
    DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
    DialogTrigger, Separator, Skeleton
} from '@/components/ui'
import { Wallet as WalletType } from '@/types'
import { Loader2 } from 'lucide-react'
import React, { useState, useCallback, useMemo } from 'react'
import { cn, formatAmountForDisplay, tryCatch } from '@/libs/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/forms'
import { useWallet } from '@/hooks'
import { toast } from 'react-toastify'

export function Wallet({ lid }: { lid: string }) {

    const { wallet, isLoading, error, mutate } = useWallet(lid)
    const [open, setOpen] = useState(false)
    const [rechargeAmount, setRechargeAmount] = useState(25)
    const [loading, setLoading] = useState(false)

    const handleRecharge = useCallback(async () => {
        if (!wallet || !rechargeAmount) return;
        setLoading(true)
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/vendor/wallet/recharge`, {
                method: 'POST',
                body: JSON.stringify({ amount: rechargeAmount, id: wallet.id })
            })
        )

        if (error || !result || !result.ok) {
            toast.error('Oops, something went wrong while trying to recharge your balance...')
            return;
        }
        mutate()
        setOpen(false)
        setLoading(false)
        toast.success('Recharged your balance successfully!')
    }, [wallet, rechargeAmount, lid, mutate])

    const rechargeOptions = useMemo(() => [10, 15, 25, 50, 100, 250, 500, 1000], [])
    const thresholdOptions = useMemo(() => [10, 25, 50, 75, 100, 250, 500], [])

    if (error) {
        return (
            <div className='border rounded-xs p-4 flex flex-col items-center justify-center'>
                <p className='text-sm text-center text-red-500'>Oops, something went wrong while trying to fetch your balance...</p>
            </div>
        )
    }

    return (
        <Card className=''>
            <CardHeader className='border-b p-0 space-y-0 flex flex-row justify-between'>
                <CardTitle className='text-sm py-2 px-4'>Your Credit Balance</CardTitle>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant={"ghost"} size={"sm"} className="border-l rounded-none cursor-pointer">
                            + Funds
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Recharge your balance</DialogTitle>
                            <DialogDescription>
                                Please select the amount you would like to recharge your balance with.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogBody>
                            <div className='flex flex-col gap-2'>
                                <div className="grid grid-cols-4 gap-2 w-full">
                                    {rechargeOptions.map((amount) => (
                                        <div key={amount}
                                            className={cn(
                                                "flex items-center justify-center px-2 py-1.5 text-sm border rounded-xs cursor-pointer hover:bg-indigo-500 hover:text-white",
                                                amount === rechargeAmount && "border-indigo-500 bg-indigo-500 text-white"
                                            )}
                                            onClick={() => setRechargeAmount(amount)}
                                        >
                                            ${amount}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </DialogBody>
                        <DialogFooter>
                            <Button variant={"clear"} size={"sm"} onClick={() => setOpen(false)}>Cancel</Button>
                            <Button variant={"continue"} size={"sm"} onClick={handleRecharge} className={cn('children:hidden', loading && 'children:inline-block')} disabled={loading}>
                                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                                Recharge
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className=' p-2 space-y-2'>
                <div className='space-y-2 p-2'>
                    <div className="flex text-xs flex-row justify-between">
                        <div className=''>Balance</div>
                        <div className=' font-bold'>
                            {isLoading ? <Skeleton className='h-4' /> : formatAmountForDisplay(wallet?.balance || 0, 'USD', true, 2)}
                        </div>
                    </div>
                    <div className="flex text-xs flex-row justify-between">
                        <div className=''>Credits</div>
                        <div className=' font-bold'>
                            {isLoading ? <Skeleton className='h-4' /> : formatAmountForDisplay(wallet?.credits || 0, 'USD', true, 2)}
                        </div>
                    </div>

                    <Separator className='my-2 bg-foreground/10' />

                    <div className='flex flex-row justify-between text-sm'  >
                        <div> Total </div>
                        <div className='font-bold text-indigo-500'>
                            {isLoading ? <Skeleton className='h-4' /> : formatAmountForDisplay(wallet?.balance + (wallet?.credits || 0), 'USD', true, 2)}
                        </div>
                    </div>
                </div>
                <AutoRecharge wallet={wallet} lid={lid} mutate={mutate} rechargeOptions={rechargeOptions} thresholdOptions={thresholdOptions} />
            </CardContent>
        </Card>
    )
}

interface AutoRechargeProps {
    wallet: WalletType,
    lid: string,
    mutate: () => void,
    rechargeOptions: number[],
    thresholdOptions: number[]
}

const AutoRecharge = React.memo(({ wallet, lid, mutate, rechargeOptions, thresholdOptions }: AutoRechargeProps) => {
    const updateWalletSettings = useCallback(async (rechargeAmount: number, rechargeThreshold: number) => {
        if (rechargeAmount === wallet.rechargeAmount && rechargeThreshold === wallet.rechargeThreshold) return;

        const { result, error } = await tryCatch(
            fetch(`/api/protected/${lid}/vendor/wallet`, {
                method: 'POST',
                body: JSON.stringify({
                    rechargeAmount: rechargeAmount,
                    rechargeThreshold: rechargeThreshold,
                    id: wallet.id
                })
            })
        )
        if (error || !result || !result.ok) {
            return;
        }
        mutate()
    }, [wallet, lid, mutate])

    return (
        <div className='text-sm space-y-2 bg-foreground/10 py-3 px-2 rounded-xs'>
            <div className='text-xs font-medium border-b pb-2 border-foreground/10'>Auto Recharge Settings</div>
            <div className='grid grid-cols-2 gap-4 text-xs'>
                <div className='flex flex-col gap-1'>
                    <span className='font-medium '>Amount</span>
                    <Select value={`${wallet?.rechargeAmount}`} defaultValue={"25"} onValueChange={(value) => {
                        updateWalletSettings(Number(value), wallet.rechargeThreshold)
                    }}>
                        <SelectTrigger className=' w-full h-auto border-none bg-indigo-500 text-white text-xs py-1 px-2 rounded-xs'>
                            <SelectValue className='text-sm' />
                        </SelectTrigger>
                        <SelectContent >
                            {rechargeOptions.map((amount) => (
                                <SelectItem key={amount} value={amount.toString()} className='text-sm'>
                                    ${amount}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className='flex flex-col gap-1'>
                    <span className='font-medium '>Threshold</span>
                    <Select value={`${wallet?.rechargeThreshold}`} defaultValue={"25"} onValueChange={(value) => {
                        updateWalletSettings(wallet.rechargeAmount, Number(value))
                    }}>
                        <SelectTrigger className='w-full h-auto border-none py-1 px-2 bg-indigo-500 text-white text-xs rounded-xs'>
                            <SelectValue className='text-sm' />
                        </SelectTrigger>
                        <SelectContent >
                            {thresholdOptions.map((amount) => (
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
})

AutoRecharge.displayName = 'AutoRecharge'
