import React, { useState } from "react";
import {
    Form,
    FormControl,
    FormItem,
    FormField,
    FormMessage,
    FormLabel,
    Textarea,
    FormDescription,
    Input
} from "@/components/forms";
import { Button } from "@/components/ui";
import { Loader2 } from "lucide-react";
import { MemberField } from "@/types";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { tryCatch } from "@/libs/utils";
import { CustomFieldSchema } from "./schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CFOptions } from "./CFOptions";

export default function EditField({ field, onClose }: { field: MemberField, onClose: () => void }) {

    const lid = field.locationId;

    const form = useForm<z.infer<typeof CustomFieldSchema>>({
        resolver: zodResolver(CustomFieldSchema),
        defaultValues: {
            name: field.name ?? "",
            type: field.type ?? "",
            placeholder: field.placeholder ?? "",
            helpText: field.helpText ?? "",
            options: field.options ?? [],
        }
    });



    async function onSubmit(v: z.infer<typeof CustomFieldSchema>) {

        const { result, error } = await tryCatch(
            fetch(
                `/api/protected/loc/${lid}/cfs/${field.id}`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        ...v
                    }),
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            )
        );

        if (error || !result || !result.ok) {

            toast.error(error?.message ?? "Failed to update custom field");
            return;
        }
        const data = await result.json();
        toast.success("Custom field updated successfully!");
        onClose?.();
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                <fieldset className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field: formField }) => (
                            <FormItem>
                                <FormLabel size="tiny">Field Name</FormLabel>
                                <FormControl>
                                    <Input {...formField} placeholder="Enter field name" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="type"
                        render={({ field: formField }) => (
                            <FormItem>
                                <FormLabel size="tiny">Field Type</FormLabel>
                                <FormControl>
                                    <Input {...formField} placeholder="Enter field type" disabled />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </fieldset>
                <fieldset >
                    <FormField
                        control={form.control}
                        name="placeholder"
                        render={({ field: formField }) => (
                            <FormItem>
                                <FormLabel size="tiny">Placeholder</FormLabel>
                                <FormControl>
                                    <Input {...formField} placeholder="Enter placeholder" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </fieldset>
                {["select", "multi-select"].includes(form.watch("type")) && (
                    <CFOptions form={form} />
                )}
                <fieldset>
                    <FormField
                        control={form.control}
                        name="helpText"
                        render={({ field: formField }) => (
                            <FormItem>
                                <FormLabel size="tiny">Help Text</FormLabel>
                                <FormControl>
                                    <Textarea
                                        className="border-foreground/20"
                                        {...formField}
                                        placeholder="Additional instructions or help text"
                                        rows={2}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Additional guidance for members
                                </FormDescription>
                            </FormItem>
                        )}
                    />
                </fieldset>
                <fieldset className="flex flex-row gap-2 justify-between mt-4">
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={onClose}
                        disabled={form.formState.isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm"
                        disabled={form.formState.isSubmitting || !form.formState.isValid}
                    >
                        {form.formState.isSubmitting ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            "Save"
                        )}
                    </Button>
                </fieldset>
            </form>
        </Form>
    );
}