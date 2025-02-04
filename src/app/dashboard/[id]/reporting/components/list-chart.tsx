import React, { forwardRef } from 'react'

const ListChartItem = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, className = '', ...props }, ref) => (
        <div
            ref={ref}


            className={`flex flex-row justify-between items-start w-full border-b border-foreground/10 pb-3 ${className}`}
            {...props}
        >
            {children}
        </div>
    )
)


const CustomerName = forwardRef<HTMLSpanElement, { children: React.ReactNode }>(
    ({ children }, ref) => (
        <span ref={ref} className='text-sm font-medium leading-none'>
            {children}
        </span>
    )
)


const CustomerEmail = forwardRef<HTMLSpanElement, { children: React.ReactNode }>(
    ({ children }, ref) => (
        <span ref={ref} className="text-xs text-gray-500 leading-none">
            {children}
        </span>
    )
)
const ListChartInfo = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
    ({ children }, ref) => (
        <div ref={ref} className="text-sm font-medium flex flex-col gap-1">
            {children}

        </div>
    )
);


interface CustomerListChartDataProps {
    children?: React.ReactNode
}

const ListChartData = forwardRef<HTMLDivElement, CustomerListChartDataProps>(({ children }, ref) => (
    <div ref={ref} className="text-sm">
        {children}
    </div>
))

export {
    ListChartItem,
    CustomerName,
    CustomerEmail,
    ListChartInfo,
    ListChartData
}