import {
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    DialogHeader,
    DialogClose,
    ScrollArea,
    DialogFooter,
    DialogBody,
    DialogTrigger
} from "@/components/ui";
import { cn, sleep, tryCatch } from "@/libs/utils";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { useState } from "react";
import useSWR from "swr";
import { Icon } from "@/components/icons";
import { LevelSchema } from "../../../../schemas";
import { DialogDescription } from "@/components/ui/dialog";
import { LevelForm } from "./LevelForm";


interface CreateLevelProps {
    pid: number;
    lid: string
}


export function CreateLevel({ pid, lid }: CreateLevelProps) {
    const { mutate } = useSWR(`/api/protected/${lid}/programs/${pid}/levels`);
    const [loading, setLoading] = useState<boolean>(false);
    const [open, setOpen] = useState<boolean>(false);


    const form = useForm<z.infer<typeof LevelSchema>>({
        resolver: zodResolver(LevelSchema),
        defaultValues: {
            name: "",
            sessions: [
                {
                    day: 1,
                    time: "12:00:00",
                    duration: 30,

                }
            ],
            capacity: 1,
            minAge: 3,
            maxAge: 5,
        },
        mode: "onSubmit",
    })



    async function submitForm(v: z.infer<typeof LevelSchema>) {

        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/${lid}/programs/${pid}/levels`, {
                method: "POST",
                body: JSON.stringify(v),
            })
        )
        setLoading(false);
        if (error || !result || !result.ok) {
            toast.error(error?.message || "Something went wrong, please try again later")
            return
        }
        await sleep(2000)
        await mutate();
        toast.success("Level Created Successfully")


    };

    return (
        <Dialog open={open} onOpenChange={setOpen} >
            <DialogTrigger asChild>

                <Button variant={"ghost"} className={" h-full border-l  rounded-none"}>
                    +
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[500px] max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        Create Level
                    </DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <LevelForm form={form} lid={lid} />
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
                        className={cn("children:hidden flex flex-row ", (loading && "children:inline-block"))}
                        onClick={form.handleSubmit(submitForm)}
                        disabled={loading || !form.formState.isValid || form.formState.isSubmitting}
                    >
                        <Icon name="LoaderCircle" size={14} className="mr-2  animate-spin" />
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>

        </Dialog >
    );
}
