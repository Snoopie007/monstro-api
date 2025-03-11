import React from 'react'

export default function ChartYAxis({ maxAmount, type }: { maxAmount: number, type: "currency" | "number" }) {
    return (
        <div className='absolute  flex-initial font-medium text-xs text-gray-400 h-full'>
            <div className='absolute top-0 left-0'>
                {type === "currency" ? (
                    <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(maxAmount)}</span>
                ) : (
                    <span>{new Intl.NumberFormat("en-US", { style: "decimal" }).format(maxAmount)}</span>
                )}
            </div>
            <div className='absolute bottom-[16%] left-0'>
                <span >$0.00</span>
            </div>
        </div>
    )
}