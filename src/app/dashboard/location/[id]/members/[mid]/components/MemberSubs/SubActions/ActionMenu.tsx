'use client'
import {
    Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui';
import { Pencil, Trash2, X, Ellipsis } from 'lucide-react';
import { MemberSubscription } from '@/types';
import { CancelSub } from '.';
import { useState } from 'react';
import { cn } from '@/libs/utils';


const HoverTransition = 'group-hover:bg-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300'


export function SubActions({ sub }: { sub: MemberSubscription }) {

    const [action, setAction] = useState<'cancel' | 'update' | undefined>(undefined);

    function handleClose(open: boolean) {
        if (!open) {
            setAction(undefined);
        }
    }

    return (
        <>
            <Dialog open={action !== undefined} onOpenChange={handleClose}>
                <DialogContent className="max-w-lg border-foreground/10 sm:rounded-lg overflow-hidden">
                    <DialogHeader className='pb-0 pt-5'>
                        <DialogTitle className='text-sm'>
                            {action === 'cancel' ? 'Cancel Subscription' : 'Update Subscription'}
                        </DialogTitle>
                        <DialogDescription className='hidden'></DialogDescription>
                    </DialogHeader>
                    <CancelSub sub={sub} show={action === 'cancel'} close={() => handleClose(false)} />
                </DialogContent>

            </Dialog>
            <div className='flex flex-row items-center '>
                <Button variant="ghost" size="icon"
                    className={cn('size-7 flex-1  rounded-r-none', HoverTransition)}
                    onClick={() => setAction('update')}>
                    <Pencil className='size-3' />
                </Button>
                <Button variant="ghost" size="icon"
                    className={cn('size-7 border-x rounded-none border-foreground/5 flex-1', HoverTransition)}
                    onClick={() => setAction('cancel')}>
                    <X className='size-3.5' />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className='size-7 group-hover:bg-foreground/5 flex-1 rounded-l-none'>
                            <Ellipsis className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className='border-foreground/10 '>

                        <DropdownMenuItem
                            className='cursor-pointer text-sm flex flex-row items-center justify-between gap-2'
                            onClick={() => setAction('update')}
                            disabled={!sub}
                        >
                            <span className='text-xs'> Update</span>
                            <Pencil className='size-3' />
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className='cursor-pointer text-sm flex flex-row items-center justify-between gap-2'
                            onClick={() => setAction('cancel')}
                            disabled={!sub}
                        >
                            <span className='text-xs'> Cancel</span>
                            <Trash2 className='size-3' />
                        </DropdownMenuItem>

                    </DropdownMenuContent>
                </DropdownMenu>

            </div>
        </>
    )
}



