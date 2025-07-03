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
import { ProgramSession } from "@/types";
import { tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";


import { SetStateAction, Dispatch, useEffect, useState } from "react";
import useSWR from "swr";
import { SessionSchema } from "../../../../schemas";
import { Loader2 } from "lucide-react";


interface UpdateProgramLevelProps {
    level: ProgramSession | null;
    setCurrentLevel: Dispatch<SetStateAction<ProgramSession | null>>;
    lid: string;
}

export function UpsertLevel({ level, setCurrentLevel, lid }: UpdateProgramLevelProps) {
    const { mutate } = useSWR(`/api/protected/${lid}/programs/${level?.programId}`);
    const [loading, setLoading] = useState<boolean>(false);

    const form = useForm<z.infer<typeof SessionSchema>>({
        resolver: zodResolver(SessionSchema),
        defaultValues: {

            day: 1,
            time: "12:00",
            duration: 30,

        },
        mode: "onSubmit",
    })


    useEffect(() => {
        if (level) {
            form.reset(level)
        }
    }, [level])

    async function submitForm(v: z.infer<typeof SessionSchema>) {
        setLoading(true)
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/programs/${level?.programId}/sessions/${level?.id}`, {
                method: 'PUT',
                body: JSON.stringify(v)
            })
        )
        if (error || !result || !result.ok) {
            toast.error(error?.message || 'Failed to update session')
        }
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
                        disabled={loading || !form.formState.isValid || form.formState.isSubmitting}
                        className={cn("  children:hidden ", (loading && "children:inline-block"))}
                        onClick={form.handleSubmit(submitForm)}
                    >
                        <Loader2 className="size-4 animate-spin mr-2" />
                        Update
                    </Button>
                </DialogFooter>
            </DialogContent>

        </Dialog >
    );
}


