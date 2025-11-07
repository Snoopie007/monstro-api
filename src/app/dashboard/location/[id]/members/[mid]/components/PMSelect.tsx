'use client'
import { Stripe } from "stripe";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/forms";


interface PMSelectProps {
    paymentMethods: Stripe.PaymentMethod[];
    onChange: (paymentMethod: Stripe.PaymentMethod) => void;
    value: string | undefined;
    defaultValue?: string | undefined;
    disabled?: boolean;
}


export function PMSelect({ paymentMethods, onChange, value, defaultValue, disabled }: PMSelectProps) {
    return (
        <Select onValueChange={(value) => {
            const paymentMethod = paymentMethods.find((method) => method.id === value)
            if (paymentMethod) {
                onChange(paymentMethod)
            }
        }} value={value} defaultValue={defaultValue} disabled={disabled} >
            <SelectTrigger>
                <SelectValue placeholder="Select a payment method" />
            </SelectTrigger>
            <SelectContent>
                {paymentMethods.map((method, index) => (
                    method.type === "card" && method.card && (
                        <PMSelector key={method.id} method={method} />
                    )
                ))}
            </SelectContent>
        </Select>
    )
}


function PMSelector({ method }: { method: Stripe.PaymentMethod }) {
    if (method.type === "card" && method.card) {
        const card = method.card as Stripe.PaymentMethod.Card;
        return (
            <SelectItem key={method.id} value={method.id} className="w-full">
                <div className="flex flex-row items-center justify-between gap-4">
                    <div className="flex flex-row items-center gap-2 ">
                        <img src={`/images/cards/${card.brand}.svg`} alt={card.brand} className="h-7 w-7" />
                        <span className="text-sm capitalize">{card.brand} •••• {card.last4}</span>
                    </div>
                    <div className="text-sm">{card.exp_month} / {card.exp_year}</div>
                </div>
            </SelectItem>
        );
    }
    if (method.type === "us_bank_account" && method.us_bank_account) {
        const bank = method.us_bank_account as Stripe.PaymentMethod.UsBankAccount;
        return (
            <SelectItem key={method.id} value={method.id} className="w-full">
                <div className="flex flex-row items-center justify-between gap-4">
                    <span className="text-sm capitalize">
                        {bank.bank_name} •••• {bank.last4}
                    </span>
                    <span className="text-sm">
                        {bank.account_type}
                    </span>
                </div>
            </SelectItem>
        );
    }
}