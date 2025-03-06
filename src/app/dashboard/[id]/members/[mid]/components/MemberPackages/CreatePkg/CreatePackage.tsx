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

import React from "react";

import { PkgForm } from "./PkgForm";
import { DEFAULT_PROGRESS, SessionForm, SubPackageProgress } from "../../SessionForm";
import { motion } from "framer-motion";

export function CreatePackage({ params }: { params: { id: string, mid: number } }) {
    const [progress, setProgress] = useState<SubPackageProgress>(DEFAULT_PROGRESS);

    const [open, setOpen] = useState<boolean>(false);

    function handleOpenChange(open: boolean) {
        setOpen(open)
        if (!open) {
            setProgress(DEFAULT_PROGRESS)
        }
    }


    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>

            <DialogTrigger asChild>
                <Button variant={"foreground"} size={"sm"} className=''>+ Package</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Create Package</DialogTitle>
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
                        <PkgForm params={params} progress={progress} setProgress={setProgress} />
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

