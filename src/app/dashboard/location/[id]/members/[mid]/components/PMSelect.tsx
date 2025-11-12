'use client'
import { Stripe } from "stripe";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/forms";
import { CardPaymentMethod, MemberPaymentMethod, UsBankAccountPaymentMethod } from "@/types";


interface PMSelectProps {
    paymentMethods: MemberPaymentMethod[];
    onChange: (paymentMethod: MemberPaymentMethod) => void;
    value: string | undefined;
    defaultValue?: string | undefined;
    disabled?: boolean;
}


export function PMSelect({ paymentMethods, onChange, value, defaultValue, disabled }: PMSelectProps) {

    if (paymentMethods.length === 0) {
        return (
            <div className="text-sm text-muted-foreground h-12 flex items-center justify-center bg-background rounded-md border border-foreground/10">
                No payment methods found
            </div>
        )
    }
    return (
        <Select onValueChange={(value) => {
            const paymentMethod = paymentMethods.find((method) => method.stripeId === value)
            if (paymentMethod) {
                onChange(paymentMethod)
            }
        }} value={value} defaultValue={defaultValue} disabled={disabled} >
            <SelectTrigger>
                <SelectValue placeholder="Select a payment method" />
            </SelectTrigger>
            <SelectContent>
                {paymentMethods.map((method) => (
                    <PMSelector key={method.stripeId} method={method} />
                ))}
            </SelectContent>
        </Select>
    )
}


function PMSelector({ method }: { method: MemberPaymentMethod }) {
    if (method.type === "card") {
        const card = method.card as CardPaymentMethod;
        return (
            <SelectItem key={method.stripeId} value={method.stripeId} className="w-full">
                <div className="flex flex-row items-center justify-between gap-4">
                    <div className="flex flex-row items-center gap-2 ">
                        <img src={`/images/cards/${card.brand || ""}.svg`} alt={card.brand || ""} className="h-7 w-7" />
                        <span className="text-sm capitalize">{card.brand} •••• {card.last4}</span>
                    </div>
                    <div className="text-sm">{card.expMonth} / {card.expYear}</div>
                </div>
            </SelectItem>
        );
    }
    if (method.type === "us_bank_account") {
        const bank = method.usBankAccount as UsBankAccountPaymentMethod;
        return (
            <SelectItem key={method.stripeId} value={method.stripeId} className="w-full">
                <div className="flex flex-row items-center justify-between gap-4">
                    <span className="text-sm capitalize">
                        {bank.bankName} •••• {bank.last4}
                    </span>
                    <span className="text-sm">
                        {bank.accountType}
                    </span>
                </div>
            </SelectItem>
        );
    }
}