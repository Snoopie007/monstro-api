import {
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    DialogHeader,
    DialogClose,
    DialogFooter,
    DialogBody,
    DialogDescription
} from "@/components/ui";
import { cn } from "@/libs/utils";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProgramLevel } from "@/types";

import { SetStateAction, Dispatch, useEffect, useState } from "react";
import useSWR from "swr";
import { Icon } from "@/components/icons";
import { LevelSchema } from "../../../../components/schemas";
import { LevelForm } from "../CreateLevel/LevelForm";


interface UpdateProgramLevelProps {
    level: ProgramLevel | null;
    setCurrentLevel: Dispatch<SetStateAction<ProgramLevel | null>>;
}

export function UpsertLevel({ level, setCurrentLevel }: UpdateProgramLevelProps) {
    const { mutate } = useSWR(`/api/protected/${level?.id}/programs/${level?.programId}/levels`);
    const [loading, setLoading] = useState<boolean>(false);

    const form = useForm<z.infer<typeof LevelSchema>>({
        resolver: zodResolver(LevelSchema),
        defaultValues: {
            name: "",
            sessions: [
                {
                    day: "",
                    time: "12:00",
                    duration: 0,
                }
            ],
            capacity: 0,
            minAge: 0,
            maxAge: 0,

        },
        mode: "onSubmit",
    })


    useEffect(() => {
        if (level) {
            form.reset(level)
        }
    }, [level])

    async function submitForm(v: z.infer<typeof LevelSchema>) {
        setLoading(true)

        await mutate()
        setLoading(false)
        setCurrentLevel(null)
    };

    return (
        <Dialog open={!!level} onOpenChange={(open) => open ? setCurrentLevel(level) : setCurrentLevel(null)} >

            <DialogContent>

                <DialogHeader>
                    <DialogTitle>
                        Update Level
                    </DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <LevelForm form={form} />
                </DialogBody>
                <DialogFooter >
                    <DialogClose asChild>
                        <Button variant={"outline"} size={"sm"}  >
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button type="submit"
                        variant={"foreground"}
                        size={"sm"}
                        className={cn("  children:hidden flex flex-row ", (loading && "children:inline-block"))}
                        onClick={form.handleSubmit(submitForm)}
                    >
                        <Icon name="LoaderCircle" size={14} className="mr-2  animate-spin" />
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>

        </Dialog >
    );
}


