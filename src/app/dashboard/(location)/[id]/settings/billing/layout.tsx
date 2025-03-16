import { ReactNode } from "react";

export default function BillingLayout({
    children,
    invoices,
}: {
    children: ReactNode,
    invoices: ReactNode,
}) {
    return (
        <div className="flex flex-col gap-4">
            {children}
            {invoices}
        </div>
    )
}