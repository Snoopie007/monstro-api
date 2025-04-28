import {
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    DialogHeader,
    DialogClose,
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
import { SessionSchema } from "../../../schemas";
import { DialogDescription } from "@/components/ui/dialog";
import SessionFields from "./SessionFields";
import { Form } from "@/components/forms";
interface CreateSessionProps {
    pid: number;
    lid: string
}


export function CreateSession({ pid, lid }: CreateSessionProps) {
    const { mutate } = useSWR(`/api/protected/${lid}/programs/${pid}/sessions`);
    const [loading, setLoading] = useState<boolean>(false);
    const [open, setOpen] = useState<boolean>(false);


    const form = useForm<z.infer<typeof SessionSchema>>({
        resolver: zodResolver(SessionSchema),
        defaultValues: {
            day: 1,
            time: "12:00:00",
            duration: 30,
        },
        mode: "onSubmit",
    })



    async function submitForm(v: z.infer<typeof SessionSchema>) {
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/programs/${pid}/sessions`, {
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
        toast.success("Session Created Successfully")


    };

    return (
        <Dialog open={open} onOpenChange={setOpen} >
            <DialogTrigger asChild>

                <Button variant={"ghost"} className={" h-full border-l  rounded-none"}>
                    + Session
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[500px] max-w-[500px]">
                <DialogHeader className="px-4 py-3 space-y-0">
                    <DialogTitle className="leading-none">
                        Create Session
                    </DialogTitle>
                    <DialogDescription className="hidden"></DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <Form {...form}>
                        <form>
                            <SessionFields control={form.control} />
                        </form>
                    </Form>
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
