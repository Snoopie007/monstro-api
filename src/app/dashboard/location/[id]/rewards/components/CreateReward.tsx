import {
    Sheet, SheetContent, SheetFooter, SheetClose, Button, ScrollArea, SheetSection,
    SheetTrigger,
    SheetTitle
} from '@/components/ui';
import { z } from "zod";
import React, { useState } from 'react'
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Form
} from '@/components/forms';
import { cn, tryCatch } from '@/libs/utils';
import { toast } from 'react-toastify';
import { RewardsSchema } from '../schemas';
import { RewardImages } from './RewardImages';
import { Loader2 } from 'lucide-react';
import { VisuallyHidden } from 'react-aria';
import RewardFields from './RewardFields';
import { useRewards } from '@/hooks/useRewards';

export interface AddrewardProps {
    lid: string,
}

export function CreateReward({ lid }: AddrewardProps) {
    const { mutate } = useRewards(lid);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);

    const form = useForm<z.infer<typeof RewardsSchema>>({
        resolver: zodResolver(RewardsSchema),
        defaultValues: {
            name: '',
            description: '',
            requiredPoints: 0,
            totalLimit: "Unlimited",
            limitPerMember: 0,
        },
        mode: "onChange",
    })

    async function handleSubmit(data: z.infer<typeof RewardsSchema>) {
        if (loading) return;
        if (!form.formState.isValid) return form.trigger();

        setLoading(true);
        const formData = new FormData();

        Object.entries(data).forEach(([key, value]) => {
            formData.append(key, value.toString());
        });



        files.forEach(file => {
            formData.append('files', file);
        });

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/rewards`, {
                method: 'POST',
                body: formData,
            })
        )


        if (error || !result || !result.ok) {
            setLoading(false);
            toast.error("Something went wrong, please try again later");
            return;
        }
        setFiles([]);
        await mutate();
        toast.success("Reward Created");
        form.reset();
        setOpen(false);
        setLoading(false);
    };


    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant={"create"} size={"sm"}>
                    + Reward
                </Button>
            </SheetTrigger>
            <SheetContent className="bg-background border-foreground/10 sm:max-w-[550px] sm:w-[550px] p-0">
                <VisuallyHidden>
                    <SheetTitle></SheetTitle>
                </VisuallyHidden>
                <ScrollArea className="h-[calc(100vh-150px)] w-full ">
                    <Form {...form}>
                        <form >
                            <RewardFields form={form} />
                            <SheetSection>
                                <RewardImages
                                    images={[]}
                                    name='files'
                                    onFileChange={(files) => setFiles(files)}
                                />
                            </SheetSection>
                        </form>
                    </Form>
                </ScrollArea>
                <SheetFooter className='border-t py-3 px-4 border-foreground/10'>
                    <SheetClose asChild>
                        <Button variant={'outline'} size={'sm'} onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                    </SheetClose>
                    <Button variant={'foreground'} size={'sm'}
                        form='reward'
                        type='submit'
                        onClick={form.handleSubmit(handleSubmit)}
                        disabled={loading || !form.formState.isValid}
                        className={cn("children:hidden", { "children:block": loading })}
                    >
                        <Loader2 className={"animate-spin mr-2 size-3.5"} />
                        Save
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}