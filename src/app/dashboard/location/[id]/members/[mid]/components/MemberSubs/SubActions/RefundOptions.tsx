'use client'
import { useState, useEffect } from 'react';
import { RadioGroup, RadioGroupItem, Label } from '@/components/forms';

interface RefundOptionsProps {
    onChange: (value: number) => void;
    amount: number;
}


export function RefundOptions({ onChange, amount }: RefundOptionsProps) {

    const [type, setType] = useState<'none' | 'full'>('none');

    useEffect(() => {
        if (type === 'full') {
            onChange(amount);
        } else {
            onChange(0);
        }
    }, [type]);
    return (
        <div className="grid grid-cols-4 gap-4  border-t border-foreground/5 pt-6 mt-6">
            <div className="font-medium col-span-1 text-sm">Refund</div>
            <RadioGroup
                value={type}
                onValueChange={(value) => setType(value as 'none' | 'full')}
                className="space-y-2 text-sm col-span-3"
            >
                <div className="flex flex-row items-center gap-3">
                    <RadioGroupItem value="none" id="none" />
                    <Label htmlFor="none" className='text-sm cursor-pointer'>
                        No refund
                    </Label>
                </div>

                <div className="flex flex-row items-center gap-3">
                    <RadioGroupItem value="full" id="full" />
                    <Label htmlFor="full" className='text-sm cursor-pointer'>
                        Last payment ${Math.round(amount / 100).toFixed(2)}
                    </Label>
                </div>

            </RadioGroup>
        </div>
    )
}