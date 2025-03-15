import {
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui";


import { useState } from "react";
import { ChevronRight } from "lucide-react";

import React from "react";
import { motion } from "framer-motion";
import { SubForm } from "./SubForm";
import { DEFAULT_PROGRESS, SessionForm, SubPackageProgress } from "../../SessionForm";

export function CreateSubscription({ params }: { params: { id: string, mid: number } }) {
    const [open, setOpen] = useState<boolean>(false);

    const [progress, setProgress] = useState<SubPackageProgress>(DEFAULT_PROGRESS);

    function handleOpenChange(open: boolean) {
        setOpen(open)
        if (!open) {
            setProgress(DEFAULT_PROGRESS)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>

            <DialogTrigger asChild>
                <Button variant={"foreground"} size={"sm"} className='border'>+ Subscription</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[500px]">
                <DialogHeader className="space-y-0">
                    <DialogTitle className='text-sm font-medium flex flex-row items-center gap-1'>

                        {['Subscribe', "Session"].map((title, index) => (
                            <React.Fragment key={index}>
                                <span className={progress.step === index + 1 ? 'text-indigo-500' :
                                    index + 1 < progress.step ? 'text-foreground' : 'text-foreground/20'}>
                                    {title}
                                </span>
                                {index < 2 - 1 && (
                                    <ChevronRight size={13} className={index + 1 < progress.step ?
                                        'text-foreground' : 'text-foreground/20'} />
                                )}
                            </React.Fragment>
                        ))}
                    </DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                {progress.step === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <SubForm params={params} progress={progress} setProgress={setProgress} />
                    </motion.div>
                )}
                {progress.step === 2 && (
                    <motion.div
                        key="step2"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <SessionForm params={params} progress={progress} />
                    </motion.div>
                )}
            </DialogContent>
        </Dialog >
    )
}

