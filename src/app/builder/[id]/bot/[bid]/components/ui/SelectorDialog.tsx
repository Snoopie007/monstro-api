"use client"
import { X } from 'lucide-react';
import React, { useEffect } from 'react'

interface NodeSelectorDialogProps extends React.HTMLAttributes<HTMLDialogElement> {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const NodeSelectorDialog = React.forwardRef<HTMLDialogElement, NodeSelectorDialogProps>(
    ({ open, onOpenChange, children, ...props }, ref) => {
        // Handle ESC key to close the dialog

        if (!open) return null;

        return (
            <div data-state={open ? "open" : "closed"} className="fixed inset-0 z-50 data-[state=open]:fade-in data-[state=closed]:fade-out">
                <div
                    className="absolute inset-0 bg-black/40 backdrop-blur-md"
                    onClick={() => onOpenChange?.(false)}
                />
                <div>
                    {React.Children.map(children, child => {
                        if (React.isValidElement(child)) {
                            return React.cloneElement(child, { onOpenChange } as React.HTMLAttributes<HTMLDivElement>);
                        }
                        return child;
                    })}
                </div>
            </div>
        )
    }
)

NodeSelectorDialog.displayName = "NodeSelectorDialog";

interface NodeSelectorContentProps extends React.HTMLAttributes<HTMLDivElement> {
    onOpenChange?: (open: boolean) => void;
}

const NodeSelectorContent = React.forwardRef<HTMLDivElement, NodeSelectorContentProps>(
    ({ children, onOpenChange, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className="absolute border left-1/2 top-1/2 w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-sm bg-background/95 shadow-sm data-[state=open]:fade-in data-[state=closed]:fade-out"
                {...props}
            >
                <div>
                    <button
                        onClick={() => onOpenChange?.(false)}
                        className="absolute right-4 top-3 rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </button>
                </div>
                {children}
            </div>
        )
    }
)

NodeSelectorContent.displayName = "NodeSelectorContent";

export {
    NodeSelectorDialog,
    NodeSelectorContent
};
