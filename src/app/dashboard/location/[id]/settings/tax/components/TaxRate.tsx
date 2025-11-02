'use client'
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
    Button,
} from '@/components/ui'
import { cn, sleep, tryCatch } from '@/libs/utils';
import React, { useEffect, useState } from 'react'

import { Input } from '@/components/forms';
import { Location } from '@/types';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';


interface StripeTaxProps {
    lid: string;
    location: Location
}

export function TaxRate({ lid, location }: StripeTaxProps) {
    const [loading, setLoading] = useState(false);
    const [value, setValue] = useState<number>(0);

    useEffect(() => {
        if (location.locationState) {
            setValue(location.locationState.taxRate);
        }
    }, [location]);


    function handleTaxRate(e: React.ChangeEvent<HTMLInputElement>) {
        const inputValue = e.target.value;
        if (inputValue === '') {
            setValue(0);
            return;
        }
        const numValue = parseFloat(inputValue);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 99.99) {
            setValue(Math.round(numValue * 100));
        }
    }

    async function save() {
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/config/tax`, {
                method: "POST",
                body: JSON.stringify({
                    taxRate: value
                })
            })
        )
        await sleep(2000);
        setLoading(false);
        if (error || !result || !result.ok) {
            toast.error("Failed to save tax rate");
            return;
        }

        return toast.success("Tax rate saved");
    }

    return (
        <Card className="rounded-sm  border-foreground/10">
            <div className="p-6 space-y-4">
                <CardHeader className="p-0 space-y-2">
                    <CardTitle className="text-base">Tax Rate</CardTitle>
                    <CardDescription>
                        Enter the tax rate for your location. This will be used to calculate the tax for all your products, services, and subscriptions.
                    </CardDescription>
                </CardHeader>
                <div className='inline-flex flex-row items-center border border-foreground/10 rounded-lg overflow-hidden'>
                    <Input
                        type="number"
                        className="border-none focus:ring-0 focus:ring-offset-0 w-25 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        placeholder={`Enter rate`}
                        value={value / 100}
                        onChange={handleTaxRate}
                        min="0"
                        max="99.99"
                        step="0.01"
                    />
                    <div className='flex h-12 items-center justify-center px-4  '>
                        <span className='text-sm'>%</span>
                    </div>
                </div>
            </div>
            <CardFooter className="flex justify-end border-t px-6 bg-foreground/5 py-3 border-foreground/10 gap-2">

                <Button
                    variant="foreground"
                    size="sm"
                    disabled={loading || value === 0}
                    onClick={save}
                    className={cn('children:hidden', loading && 'children:block')}
                >
                    <Loader2 className='size-4 mr-2' />
                    Save
                </Button>

            </CardFooter>
        </Card>
    )
}
