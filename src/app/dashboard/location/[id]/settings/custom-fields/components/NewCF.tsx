"use client"

import {

    PlusIcon,
    TextIcon,
    HashIcon,
    CalendarIcon,
    CheckIcon,
    BoxSelectIcon,
    ListIcon,
    Loader2,
} from "lucide-react"

import { ButtonGroup, Dialog, DialogContent, DialogTitle, DialogClose, Button } from "@/components/ui/"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { VisuallyHidden } from "react-aria"
import { useState, useEffect } from "react"
import CFForm from "./CFForm"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CustomFieldSchema, FieldType } from "./schemas"
import { z } from "zod"
import { tryCatch } from "@/libs/utils"
import { toast } from "react-toastify"
import { useCustomFields } from "../provider";

const FIELD_TYPES: { type: FieldType, label: string, icon: React.ReactNode }[] = [
    { type: "text", label: "Text", icon: <TextIcon className="size-3" /> },
    { type: "number", label: "Number", icon: <HashIcon className="size-3" /> },
    { type: "date", label: "Date", icon: <CalendarIcon className="size-3" /> },
    { type: "boolean", label: "Checkbox", icon: <CheckIcon className="size-3" /> },
    { type: "select", label: "Select", icon: <BoxSelectIcon className="size-3" /> },
    { type: "multi-select", label: "Multi-Select", icon: <ListIcon className="size-3" /> },
]



export function NewCF({ lid }: { lid: string }) {
    const [open, setOpen] = useState(false);
    const [selectedFieldType, setSelectedFieldType] = useState<FieldType | null>(null);
    const { setFields } = useCustomFields();
    const form = useForm<z.infer<typeof CustomFieldSchema>>({
        resolver: zodResolver(CustomFieldSchema),
        defaultValues: {
            name: "",
            type: "text",
            placeholder: "",
            helpText: "",
            options: [],
        },
        mode: "onChange"
    });

    useEffect(() => {
        if (selectedFieldType) {
            form.setValue("type", selectedFieldType);
            if (selectedFieldType === "select" || selectedFieldType === "multi-select") {
                form.setValue("options", [
                    { value: "banana", label: "Banana" }
                ]);
            }
            setOpen(true);
        }
    }, [selectedFieldType]);

    async function onSubmit(v: z.infer<typeof CustomFieldSchema>) {
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/cfs`, {
                method: "POST",
                body: JSON.stringify(v),
            })
        );
        if (error || !result || !result.ok) {
            toast.error(error?.message ?? "Failed to create custom field");
            return;
        }
        const data = await result.json();
        toast.success("Custom field created successfully!");
        form.reset();
        setOpen(false);
        setSelectedFieldType(null);
        setFields((prev) => [...prev, data]);
    }


    function handleOpenChange(open: boolean) {
        setOpen(open);
        if (!open) {
            setSelectedFieldType(null);
        }
    }
    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="max-w-lg border-foreground/10  p-4">
                    <VisuallyHidden>
                        <DialogTitle></DialogTitle>
                    </VisuallyHidden>
                    <CFForm form={form} />
                    <div className="flex flex-row gap-2 justify-between mt-4">
                        <DialogClose asChild>
                            <Button variant="destructive">Cancel</Button>
                        </DialogClose>
                        <Button variant="primary" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting || !form.formState.isValid}>
                            {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : 'Create'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            <ButtonGroup>
                <Button variant="outline" className=" border-foreground/10">Add Field</Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="!px-3   border-foreground/10">
                            <PlusIcon className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="border-foreground/10 w-[200px]">
                        <DropdownMenuGroup>
                            {FIELD_TYPES.map((type) => (
                                <DropdownMenuItem key={type.type}
                                    className="flex cursor-pointer text-xs flex-row items-center justify-between gap-2"
                                    onClick={() => { setSelectedFieldType(type.type) }}
                                >

                                    <span>{type.label}</span>
                                    <span>{type.icon}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuGroup>

                    </DropdownMenuContent>
                </DropdownMenu>
            </ButtonGroup>
        </>
    )
}
