'use client'
import { Switch } from '@/components/ui'
import { tryCatch } from '@/libs/utils';
import React from 'react'
import { toast } from 'react-toastify';
import { useAccountStatus } from '../../../providers';
import { PaymentType } from '@/types/DatabaseEnums';
import { SettingsBox, SettingContent, SettingsDescription, SettingsTitle } from '../../components';
type ProcessingMethod = {
    type: PaymentType
    name: string
    description: string
}

const METHODS: Array<ProcessingMethod> = [
    {
        type: "card",
        name: "Credit Card",
        description: "Standard credit card processing such as Visa, Mastercard, American Express, etc."
    },
    {
        type: "us_bank_account",
        name: "Bank Account",
        description: "ACH bank account processing for US customers."
    },
    // {
    //     type: "paypal",
    //     name: "PayPal",
    //     description: "PayPal processing for international customers."
    // },
    // {
    //     type: "apple_pay",
    //     name: "Apple Pay",
    //     description: "Apple Pay processing for Apple customers."
    // },
    // {
    //     type: "google_pay",
    //     name: "Google Pay",
    //     description: "Google Pay processing for Google customers."
    // }
]

// Assume locationState.settings.processingMethods: PaymentType[] | undefined
export function ProcessingMethods({ lid }: { lid: string }) {
    const { locationState, updateState } = useAccountStatus();

    const methods = locationState.settings.processingMethods;
    // Check if a method is enabled in the location settings
    function isMethodEnabled(type: PaymentType): boolean {
        return methods.includes(type);
    }

    async function handleMethodToggle(method: ProcessingMethod, checked: boolean) {
        // Build new processing method array

        let next: PaymentType[];
        if (checked) {
            // Add the method if not present
            if (!methods.includes(method.type)) next = [...methods, method.type];
            else next = methods;
        } else {
            if (methods.length === 1) {
                toast.error("At least one processing method must remain enabled.");
                return;
            }
            next = methods.filter((t) => t !== method.type);
        }

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/config/processing`, {
                method: "PATCH",
                body: JSON.stringify({
                    settings: {
                        ...locationState.settings,
                        processingMethods: next,
                    }
                })
            })
        );
        if (error || !result || !result.ok) {
            toast.error("Failed to update processing methods");
            return;
        }
        updateState(
            (prev) => ({
                ...prev,
                settings: {
                    ...prev.settings,
                    processingMethods: next,
                }
            })
        );
    }

    return (
        <>
            {METHODS.map((method) => (
                <SettingsBox key={method.type}>
                    <SettingContent>
                        <SettingsTitle>{method.name}</SettingsTitle>
                        <SettingsDescription>{method.description}</SettingsDescription>
                    </SettingContent>
                    <Switch
                        checked={isMethodEnabled(method.type)}
                        onCheckedChange={(checked: boolean) => handleMethodToggle(method, checked)}
                        disabled={methods.length === 1 && isMethodEnabled(method.type)}

                    />
                </SettingsBox>
            ))}
        </>
    )
}
