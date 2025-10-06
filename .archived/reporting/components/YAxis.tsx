import React from 'react'

interface ChartYAxisProps {
    max: number
    min: number
    type: "currency" | "number"
}

export default function ChartYAxis({ max, min, type }: ChartYAxisProps) {
    return (
        <div className='absolute  flex-initial font-medium text-xs text-gray-400 h-full'>
            <div className='absolute top-0 left-0'>
                {type === "currency" ? (
                    <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(max)}</span>
                ) : (
                    <span>{new Intl.NumberFormat("en-US", { style: "decimal" }).format(max)}</span>
                )}
            </div>
            <div className='absolute bottom-[16%] left-0'>
                <span >
                    {type === "currency" ? (
                        <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(min)}</span>
                    ) : (
                        <span>{new Intl.NumberFormat("en-US", { style: "decimal" }).format(min)}</span>
                    )}

                </span>
            </div>
        </div>
    )
}