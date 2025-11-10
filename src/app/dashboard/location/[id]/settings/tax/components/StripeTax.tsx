'use client'
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
    Button,
} from '@/components/ui'
import { tryCatch } from '@/libs/utils';
import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify';
import { StripeTaxSettings } from './StripeTaxSettings';
import { Location } from '@/types';
import Stripe from 'stripe';
import { Loader2 } from 'lucide-react';

interface StripeTaxProps {
    lid: string;
    location: Location;
    taxSettings: string;
}

export function StripeTax({ lid, location, taxSettings }: StripeTaxProps) {
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState<Stripe.Tax.Settings | null>(null);

    useEffect(() => {
        if (taxSettings) {
            setSettings(JSON.parse(taxSettings));
        }
    }, [taxSettings]);

    const isActive = settings?.status === 'active';

    async function disableTax() {
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/config/tax`)
        )
        if (error || !result || !result.ok) {
            toast.error(error?.message || 'Something went wrong');
        }
        setLoading(false);
    }

    return (
        <Card>
            <CardHeader className="p-6 space-y-2">
                <CardTitle className="text-base">Stripe Tax Settings</CardTitle>
                <CardDescription>
                    Manage your tax settings for Stripe. In order to use Stripe Tax, you must enable and setup your tax settings for your Stripe account.
                </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-end border-t px-6 bg-foreground/5 py-3 border-foreground/10 gap-2">
                {isActive ? (
                    <StripeTaxSettings lid={lid} location={location} settings={settings} updateSettings={setSettings} />
                ) : (
                    <Button
                        variant="destructive"
                        size="sm"
                        disabled={loading}
                        onClick={disableTax}
                    >
                        {loading ? <Loader2 className='size-4 animate-spin' /> : "Disable"}
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}