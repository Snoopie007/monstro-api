import { UseFormReturn } from "react-hook-form";
import { CustomFieldSchema } from "./schemas";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription, Textarea, Input } from "@/components/forms";
import { CFOptions } from "./CFOptions";

export default function CFForm({ form }: { form: UseFormReturn<z.infer<typeof CustomFieldSchema>> }) {
    return (
        <Form {...form}>
            <form className="space-y-2">
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

            </form>
        </Form>
    )
}