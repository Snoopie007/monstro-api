'use client'
import { Card, Switch } from '@/components/ui'
import { tryCatch } from '@/libs/utils';
import React, { useState } from 'react'
import { toast } from 'react-toastify';
import { useAccountStatus } from '../../../providers';


export function PassOnFees({ lid }: { lid: string }) {
    const { locationState, updateLocationState } = useAccountStatus();


    async function update() {
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/config/processing`, {
                method: "PATCH",
                body: JSON.stringify({
                    settings: {
                        ...locationState.settings,
                        passOnFees: !locationState.settings.passOnFees
                    }
                })
            })
        )
        if (error || !result || !result.ok) {
            toast.error("Failed to update pass on processing fees");
            return;
        }
        updateLocationState({
            ...locationState,
            settings: {
                ...locationState.settings,
                passOnFees: !locationState.settings.passOnFees
            }
        });
    }

    return (
        <Card className='p-4 flex flex-row justify-between items-center rounded-lg'>
            <div className="space-y-1 w-full">
                <div className="text-base font-medium">Pass On Fees</div>
                <p className="text-sm text-muted-foreground">
                    Turn this on if you want to pass on credit card fees to your customers via transaction fees.
                </p>
            </div>
            <Switch checked={locationState.settings.passOnFees} onCheckedChange={update} />
        </Card>
    )
}
