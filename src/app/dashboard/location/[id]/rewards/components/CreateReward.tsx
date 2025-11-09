'use client'
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogFooter,
    Button,
    ScrollArea,
    DialogTitle
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
import { useRewards } from '../providers';

export interface AddrewardProps {
    lid: string,
}

export function CreateReward({ lid }: AddrewardProps) {
    const { setRewards } = useRewards();
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

    async function handleSubmit(v: z.infer<typeof RewardsSchema>) {
        if (loading) return;
        if (!form.formState.isValid) return form.trigger();

        setLoading(true);
        const formData = new FormData();

        Object.entries(v).forEach(([key, value]) => {
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
        const data = await result.json();
        setRewards((prev) => [...prev, data]);
        setFiles([]);
        toast.success("Reward Created");
        form.reset();
        setOpen(false);
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={"primary"}>
                    + Reward
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-background border-foreground/10 sm:max-w-[550px] sm:w-[550px] p-0">
                <VisuallyHidden>
                    <DialogTitle></DialogTitle>
                </VisuallyHidden>
                <ScrollArea className="h-[calc(100vh-400px)] bg-foreground/5 w-full ">
                    <Form {...form}>
                        <form className='space-y-4 p-4'  >
                            <RewardFields form={form} />
                            <RewardImages
                                images={[]}
                                name='files'
                                onFileChange={(files) => setFiles(files)}
                            />
                        </form>
                    </Form>
                </ScrollArea>
                <DialogFooter className='p-4  flex flex-row justify-between'>
                    <Button variant={'outline'} onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button variant={'primary'}
                        type='submit'
                        onClick={form.handleSubmit(handleSubmit)}
                        disabled={loading || !form.formState.isValid}
                    >
                        {loading ? <Loader2 className={"animate-spin size-3.5"} /> : 'Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}