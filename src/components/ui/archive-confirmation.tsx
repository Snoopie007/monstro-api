import React, { ReactNode } from 'react';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle, AlertDialogTrigger, AlertDialogAction } from '@/components/ui/AlertDialog';
import { cn } from '@/libs/utils';

export const ArchiveConfirmation = ({ removeFunction, entity, params, buttonType, buttonClassName, openButtonText }: { removeFunction: Function, entity: string, params: any, buttonType: string, buttonClassName: string, openButtonText: string | ReactNode }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {buttonType == 'button' ? (
        <AlertDialogTrigger className={cn(buttonClassName, "text-sm font-semibold")}>
          {openButtonText as string}
        </AlertDialogTrigger>
      ) : (
        <AlertDialogTrigger className={cn(buttonClassName, "text-sm font-semibold")}>
          {openButtonText as ReactNode}
        </AlertDialogTrigger>
      )
      }

      <AlertDialogPortal>
        <AlertDialogOverlay />
        <AlertDialogContent className='bg-transparent'>
          <AlertDialogTitle className="text-black-100">Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will archive this {entity}. Click Archive if you want to continue.
          </AlertDialogDescription>
          <div className='flex flex-row gap-2 justify-end w-full'>
            <AlertDialogCancel asChild className='bg-transparent font-semibold text-black-100 py-3 px-4 rounded-[4px] text-sm capitalize border-gray-200'><button>Cancel</button></AlertDialogCancel>
            <AlertDialogAction asChild className='bg-black-100'>
              <button className=' text-white py-3 px-4 rounded-[4px]  font-semibold flex flex-row capitalize hover:opacity-90' onClick={() => removeFunction(params)}>Archive</button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialog>
  );
};