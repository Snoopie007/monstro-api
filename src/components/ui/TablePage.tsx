"use client"
import { cn } from '@/libs/utils';
import React from 'react'


const TablePage = React.forwardRef<HTMLDialogElement, React.HTMLAttributes<HTMLDialogElement>>(
    ({ children, ...props }, ref) => {

        // React.Children.forEach(children, child => {
        //     if (React.isValidElement(child)) {
        //         if (child.type !== TablePageHeader) {
        //             throw new Error('TablePage children must be either TablePageHeader');
        //         }
        //     }
        // });

        return (
            <main className="flex flex-col w-full h-full">
                {children}
            </main>
        )
    }
)
TablePage.displayName = "TablePage";
const TableHeaderContext = React.createContext(false);

const TablePageHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => {
        // Validate that children only contain TablePageHeaderTitle and TablePageHeaderSection
        // React.Children.forEach(children, child => {
        //     if (React.isValidElement(child)) {
        //         if (child.type !== TablePageHeaderTitle && child.type !== TablePageHeaderSection) {
        //             throw new Error('TablePageHeader children must be either TablePageHeaderTitle or TablePageHeaderSection');
        //         }
        //     }
        // });

        return (
            <TableHeaderContext.Provider value={true}>
                <div ref={ref} className='flex flex-row border-b border-foreground/10 flex-initial justify-start items-center gap-2 '>
                    {children}
                </div>
            </TableHeaderContext.Provider>
        )
    }
)

TablePageHeader.displayName = "TablePageHeader";

const TablePageHeaderTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => {
        // Ensure this component is used within TablePageHeader
        const isWithinHeader = React.useContext(TableHeaderContext);
        if (!isWithinHeader) {
            throw new Error('Title must be used within Page Header');
        }

        return (
            <div className={cn("border-r border-foreground/10 px-2 py-1.5", props.className)}>
                <h6 className='text-sm font-bold'>
                    {children}
                </h6>
            </div>
        )
    }
)

TablePageHeaderTitle.displayName = "TablePageHeaderTitle";

const TablePageHeaderSection = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => {
        // Ensure this component is used within TablePageHeader
        const isWithinHeader = React.useContext(TableHeaderContext);
        if (!isWithinHeader) {
            throw new Error('Header Section must be used within Table Header');
        }

        return (
            <div ref={ref} className={cn("flex flex-row items-center gap-2 py-1.5", props.className)} {...props}>
                {children}
            </div>
        )
    }
)

TablePageHeaderSection.displayName = "TablePageHeaderSection";

const TablePageContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn("flex-1", props.className)}
                {...props}
            >
                {children}
            </div>
        )
    }
)

const TablePageFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => {
        return (
            <div ref={ref} className={cn("flex-initial max-h-[35px] border-t border-foreground/10 py-2 ", props.className)} {...props}>
                <div className="flex gap-1 items-center h-full text-xs">
                    {children}
                </div>
            </div>
        )
    }
)

TablePageFooter.displayName = "TablePageFooter";

export {
    TablePage,
    TablePageContent,
    TablePageHeader,
    TablePageHeaderTitle,
    TablePageHeaderSection,
    TablePageFooter
};
