import { Input } from "@/components/forms/input"
import { UseFormReturn } from "react-hook-form"

import { FormLabel, FormDescription, FormControl, FormItem, FormField, FormMessage } from "@/components/forms"
import { ConditionNodeSchema } from "../schemas"
import { z } from "zod"

interface DefaultPathProps {
    form: UseFormReturn<z.infer<typeof ConditionNodeSchema>>,
    i: number
}

export default function DefaultPath({ form, i }: DefaultPathProps) {

    return (
        < FormField
            control={form.control}
            name={`paths.${i}.data.label`}
            render={({ field }) => (
                <FormItem >
                    <FormLabel size="tiny">Default Path</FormLabel>
                    <FormDescription>This is the default path if the condition is not met.</FormDescription>
                    <FormControl>
                        <Input className="rounded-xs resize-y " placeholder=" " {...field} />
                    </FormControl>
                    < FormMessage />
                </FormItem>
            )}
        />
    )
}