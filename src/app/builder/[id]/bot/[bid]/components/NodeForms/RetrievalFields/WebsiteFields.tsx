
import {
    FormField, FormItem, FormLabel, FormControl,
    Input,
    FormMessage,
} from '@/components/forms'
import { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { RetrievalNodeSchema } from '../schemas'

export function WebsiteFields({ form }: { form: UseFormReturn<z.infer<typeof RetrievalNodeSchema>> }) {

    return (
        <fieldset>
            <FormField
                control={form.control}
                name="retrieval.website.url"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel size="tiny">Website URL</FormLabel>
                        <FormControl>
                            <Input type="text" placeholder="Enter URL" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </fieldset>
    )
}
