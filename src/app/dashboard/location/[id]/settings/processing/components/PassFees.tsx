'use client'
import { Switch } from '@/components/ui'
import { tryCatch } from '@/libs/utils';
import React from 'react'
import { toast } from 'react-toastify';
import { useAccountStatus } from '../../../providers';
import { SettingContent, SettingsDescription, SettingsBox, SettingsTitle } from '../../components/';


export function PassOnFees({ lid }: { lid: string }) {
    const { locationState, updateState } = useAccountStatus();


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
        updateState((prev) => ({
            ...prev,
            settings: {
                ...prev.settings,
                passOnFees: !prev.settings.passOnFees
            }
        }));
    }

    return (
        <SettingsBox>
            <SettingContent>
                <SettingsTitle>
                    Pass On Fees</SettingsTitle>
                <SettingsDescription>
                    Turn this on if you want to pass on credit card fees to your customers via transaction fees.

                </SettingsDescription>
            </SettingContent>
            <Switch checked={locationState.settings.passOnFees} onCheckedChange={update} />
        </SettingsBox>
    )
}


