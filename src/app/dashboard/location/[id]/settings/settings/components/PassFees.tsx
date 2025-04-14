'use client'
import { Card, Switch } from '@/components/ui'
import React, { useState } from 'react'

export default function PassFees() {
    const [passOnFees, setPassOnFees] = useState(false);
    return (
        <Card className='p-4 flex flex-row justify-between items-center rounded-sm bg-foreground/5 border-foreground/10'>
            <div className="pace-y-1 w-full">
                <div className="text-base font-medium">Pass On Fees</div>
                <p className="text-sm text-muted-foreground">
                    Turn this on if you want to pass on credit card fees to your customers via transaction fees.
                </p>
            </div>
            <Switch checked={passOnFees} onCheckedChange={setPassOnFees} />
        </Card>
    )
}
