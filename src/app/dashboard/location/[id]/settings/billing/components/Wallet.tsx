'use client'
import {
    Button, Card, CardContent, CardHeader, CardTitle, Dialog,
    DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
    DialogTrigger, Separator, Skeleton
} from '@/components/ui'
import { Wallet as WalletType } from '@/types'
import { InfoIcon, Loader2 } from 'lucide-react'
import React, { useState, useCallback, useMemo } from 'react'
import { cn, formatAmountForDisplay, tryCatch } from '@/libs/utils'
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/forms'
import { useWallet } from '@/hooks'
import { toast } from 'react-toastify'

export function Wallet({ lid }: { lid: string }) {

    const { wallet, isLoading, error, mutate } = useWallet(lid)
    const [open, setOpen] = useState(false)
    const [rechargeAmount, setRechargeAmount] = useState(25)
    const [loading, setLoading] = useState(false)

    async function handleRecharge() {
        if (!wallet || !rechargeAmount) return;
        if (rechargeAmount < 15) {
            toast.error('Amount must be greater than $15')
            return;
        }
        setLoading(true)
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/vendor/wallet/recharge`, {
                method: 'POST',
                body: JSON.stringify({ amount: rechargeAmount, id: wallet.id })
            })
        )

        if (error || !result || !result.ok) {
            setLoading(false)
            toast.error('Oops, something went wrong while trying to recharge your balance...')
            return;
        }
        mutate()
        setOpen(false)
        setLoading(false)
        toast.success('Recharged your balance successfully!')
    }

    const rechargeOptions = useMemo(() => [10, 15, 25, 50, 100, 250, 500, 1000], [])
    const thresholdOptions = useMemo(() => [10, 25, 50, 75, 100, 250, 500], [])

    if (error) {
        return (
            <div className='border rounded-xs p-4 flex flex-col items-center justify-center'>
                <p className='text-sm text-center text-red-500'>
                    Oops, something went wrong while trying to fetch your balance...
                </p>
            </div>
        )
    }

    return (
        <div className='border rounded-lg border-foreground/10 p-4'>
            <div className='flex flex-row justify-between items-center mb-6'>
                <div className='font-medium'>Wallet Balance</div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant={"primary"} size={"xs"}>
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
                        <div className='px-4 py-2 space-y-6'>
                            <Input type="number"
                                value={rechargeAmount}
                                placeholder='Enter amount greater than $15'
                                onChange={(e) => setRechargeAmount(parseInt(e.target.value))}
                                min={25}
                                max={1000000}
                                step={1}
                                className='w-full bg-foreground/5'
                            />
                            <div className='bg-foreground/5 p-2 rounded-lg flex flex-row  gap-2 text-sm text-foreground/50'>
                                <InfoIcon className='size-4 text-yellow-500 flex-shrink-0 mt-0.5' />
                                <p className='flex-1 leading-tight'>
                                    The amount you enter above will be charged on your default payment method
                                    . The minimum recharge amount is <span className='font-bold'>$15</span>
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant={"clear"} size={"sm"} onClick={() => setOpen(false)}>Cancel</Button>
                            <Button variant={"primary"} size={"sm"} onClick={handleRecharge} className={cn('children:hidden', loading && 'children:inline-block')} disabled={loading}>
                                {loading ? <Loader2 className='size-4 animate-spin' /> : 'Recharge'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <div className=' space-y-4'>
                <div className='space-y-2'>
                    <div className="flex  flex-row justify-between">
                        <div className=''>Balance</div>
                        <div className=' font-bold'>
                            {isLoading ? <Skeleton className='h-4' /> : formatAmountForDisplay(wallet?.balance || 0, 'USD', true, 2)}
                        </div>
                    </div>
                    <div className="flex  flex-row justify-between">
                        <div className=''>Credits</div>
                        <div className=' font-bold'>
                            {isLoading ? <Skeleton className='h-4' /> : formatAmountForDisplay(wallet?.credits || 0, 'USD', true, 2)}
                        </div>
                    </div>

                    <Separator className='my-2 bg-foreground/10' />

                    <div className='flex flex-row justify-between'  >
                        <div> Total </div>
                        <div className='font-bold text-indigo-500'>
                            {isLoading ? <Skeleton className='h-4' /> : formatAmountForDisplay(wallet?.balance + (wallet?.credits || 0), 'USD', true, 2)}
                        </div>
                    </div>
                </div>
                <AutoRecharge wallet={wallet} lid={lid} mutate={mutate} rechargeOptions={rechargeOptions} thresholdOptions={thresholdOptions} />
            </div>
        </div>
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
            fetch(`/api/protected/loc/${lid}/vendor/wallet`, {
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
        <div className='flex flex-row items-center gap-2 bg-foreground/10 p-3 rounded-lg'>
            <span>Auto recharge with</span>
            <Select value={`${wallet?.rechargeAmount / 100}`} defaultValue={"25"} onValueChange={(value) => {
                updateWalletSettings(parseInt(value) * 100, wallet.rechargeThreshold)
            }}>
                <SelectTrigger className='w-[100px]'>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent >
                    {rechargeOptions.map((amount) => (
                        <SelectItem key={amount} value={amount.toString()}>
                            ${amount}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <span>when balance is below</span>
            <Select value={`${wallet?.rechargeThreshold / 100}`} defaultValue={"25"} onValueChange={(value) => {
                updateWalletSettings(wallet.rechargeAmount, parseInt(value) * 100)
            }}>
                <SelectTrigger className='w-[100px]'>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent >
                    {thresholdOptions.map((amount) => (
                        <SelectItem key={amount} value={amount.toString()}>
                            ${amount}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
})

AutoRecharge.displayName = 'AutoRecharge'
