"use client";
import { useState, useEffect } from "react";
import { MemberField } from "@subtrees/types";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { tryCatch } from "@/libs/utils";
import { CustomFieldSchema } from "./schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogTitle, Button, DialogClose } from "@/components/ui";
import { VisuallyHidden } from "react-aria";
import CFForm from "./CFForm";
import { Loader2 } from "lucide-react";
import { useCustomFields } from "../provider";


export default function EditCF() {
    const { selectedField, setSelectedField, setFields } = useCustomFields();
    const [open, setOpen] = useState(false);
    const lid = selectedField?.locationId;

    const form = useForm<z.infer<typeof CustomFieldSchema>>({
        resolver: zodResolver(CustomFieldSchema),
        defaultValues: {
            name: selectedField?.name,
            type: selectedField?.type,
            placeholder: selectedField?.placeholder ?? "",
            helpText: selectedField?.helpText ?? "",
            options: selectedField?.options ?? [],
        },
        mode: "onChange"
    });

    useEffect(() => {
        if (selectedField) {
            setOpen(true);
        }
    }, [selectedField?.id]);

    function handleOpenChange(open: boolean) {
        setOpen(open);
        if (!open) {
            setSelectedField(null);
        }
    }

    async function onSubmit(v: z.infer<typeof CustomFieldSchema>) {

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/cfs/${selectedField?.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                    ...v
                }),
            })
        );

        if (error || !result || !result.ok) {

            toast.error(error?.message ?? "Failed to update custom field");
            return;
        }
        toast.success("Custom field updated successfully!");
        setOpen(false);
        setFields((prev) => prev.map((f) => f.id === selectedField?.id ? { ...f, ...v } : f));
    }


    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-lg border-foreground/10  p-4">
                <VisuallyHidden>
                    <DialogTitle></DialogTitle>
                </VisuallyHidden>

                <CFForm form={form} />
                <div className="flex flex-row gap-2 justify-between mt-4">
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"

                            disabled={form.formState.isSubmitting}
                        >
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button type="submit" variant="primary" size="sm"
                        disabled={form.formState.isSubmitting || !form.formState.isValid}
                        onClick={form.handleSubmit(onSubmit)}
                    >
                        {form.formState.isSubmitting ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            "Save"
                        )}
                    </Button>

                </div>
            </DialogContent>
        </Dialog>

    );
}