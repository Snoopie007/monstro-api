'use client'

import { useState } from "react";
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@/components/forms";
import { useMemberPaymentMethods } from "../../../../providers";

interface PaymentMethodPickerProps {
    method: Record<string, any>;
}

export function PaymentMethodPicker({ method }: PaymentMethodPickerProps) {
    const [change, setChange] = useState<boolean>(false);
    const { paymentMethods } = useMemberPaymentMethods();

    return (
        <div>
            {!change ? (
                <div className="bg-foreground/5 px-4 py-2 rounded-sm flex flex-row items-center justify-between">
                    <span className="text-xs ">
                        {method.card.brand} •••• {method.card.last4}
                    </span>
                    <div className="flex flex-row text-xs text-indigo-500 items-center gap-2 cursor-pointer"
                        onClick={() => setChange(true)}>
                        Change
                    </div>
                </div>
            ) : (
                <Select>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a payment method" />
                    </SelectTrigger>
                    <SelectContent>
                        {paymentMethods?.map((method) => (
                            <SelectItem key={method.id} value={method.id}>
                                <div className="flex flex-row items-center gap-2">
                                    {method.card && (
                                        <>
                                            <img
                                                src={`/images/cards/${method.card.brand}.svg`}
                                                alt={method.card.brand}
                                                className="h-5 w-5"
                                            />
                                            <span className="text-sm capitalize">
                                                {method.card.brand} •••• {method.card.last4}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </div>
    );
}
