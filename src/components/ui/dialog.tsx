"use client";

import { cn } from "@/libs/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as React from "react";

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 pointer-events-none data-[state=open]:pointer-events-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        `fixed left-[50%] top-[50%] z-50 grid w-full max-h-[90vh]
				 max-w-lg translate-x-[-50%] translate-y-[-50%] border border-foreground/10 bg-background
				 grid-rows-[auto_1fr_auto] overflow-hidden
				 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
				 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
				shadow-lg duration-200 sm:rounded-lg`,
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

type DialogBodyProps = React.HTMLAttributes<HTMLDivElement> & {
  children?: React.ReactNode;
  className?: string;
};

const DialogBody = React.forwardRef<HTMLDivElement, DialogBodyProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("bg-foreground/5 p-4 overflow-y-auto", className)} {...props}>
      {children}
    </div>
  )
);

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 px-4 py-3 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse px-4 py-3 sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-base font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
const MultiDialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        `fixed left-[50%] top-[50%] z-50 grid w-full
				 max-w-lg translate-x-[-50%] translate-y-[-50%] 
				 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 
				 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
				duration-200 `,
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
MultiDialogContent.displayName = DialogPrimitive.Content.displayName;
const DialogSlide = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    show?: boolean;
  }
>(({ className, children, show = false, ...props }, ref) => (
  <div
    className={cn(
      `border border-foreground/10 bg-background shadow-lg w-full transition-all duration-300 ease-out absolute top-0
			data-[state=open]:translate-y-[-50%] data-[state=closed]:translate-y-[200%]
			data-[state=open]:opacity-100 data-[state=closed]:opacity-0
			sm:rounded-lg
			`,
      className
    )}
    data-state={show ? "open" : "closed"}
    ref={ref}
    {...props}
  >
    {children}
  </div>
));
DialogSlide.displayName = DialogPrimitive.Content.displayName;

export {
  Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogSlide, DialogTitle, DialogTrigger, MultiDialogContent
};
