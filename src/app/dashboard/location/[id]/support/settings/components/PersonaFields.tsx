import { FormLabel } from "@/components/forms"
import { UseFormReturn } from "react-hook-form"
import { SupportBotSchema } from "@/libs/FormSchemas"
import { z } from "zod"
import { InputTags } from "@/components/forms"
import {
    FormField,
    FormItem,
    FormControl,
    FormMessage,
    Textarea,
    Input,
} from "@/components/forms"
import { cn } from "@/components/event-calendar"


interface PersonaFieldsProps {
    form: UseFormReturn<z.infer<typeof SupportBotSchema>>

}

const BotPersonalities = [
    "professional", "friendly", "informative",
    "funny", "serious", "casual", "formal", "sarcastic",
    "helpful", "confident", "humble", "bold", "shy"
]
const DummyImages = [
    "https://randomuser.me/api/portraits/lego/1.jpg",
    "https://randomuser.me/api/portraits/lego/2.jpg",
    "https://randomuser.me/api/portraits/lego/3.jpg",
    "https://randomuser.me/api/portraits/lego/4.jpg",
]
export function PersonaFields({ form }: PersonaFieldsProps) {
    const avatar = form.watch('persona.avatar')
    return (
        <div className='space-y-2 bg-foreground/5 rounded-md p-4'>
            <fieldset className='space-y-2'>
                <FormLabel size={'sm'}>Give your bot an avatar</FormLabel>
                <div className='flex flex-row gap-2'>
                    {DummyImages.map((image, i) => (
                        <div key={i}
                            className={cn(
                                'relative border-2 group border-transparent cursor-pointer',
                                'transition-all duration-300 hover:scale-110',
                                avatar === image ? 'scale-110 ' : ''
                            )}
                            data-selected={avatar === image}
                            onClick={() => {
                                form.setValue('persona.avatar', image)
                            }}
                        >
                            <img src={image} alt='avatar' width={50} height={50}
                                className='rounded-sm transition-transform grayscale-100 hover:grayscale-0 
                                              duration-300 hover:brightness-110 group-data-[selected=true]:grayscale-0'

                            />

                        </div>
                    ))}
                </div>
            </fieldset>
            <fieldset >
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel size={'sm'}>Give your bot a name</FormLabel>
                            <FormControl>
                                <Input {...field} className='rounded-md border-foreground/5 shadow-none' />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </fieldset>
            <fieldset>
                <FormField
                    control={form.control}
                    name="persona.responseStyle"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel size={'sm'}>Response Instructions</FormLabel>
                            <FormControl>
                                <Textarea {...field} className='rounded-md border-foreground/5 h-30 shadow-none resize-none'
                                    placeholder='eg. respond in a friendly and engaging manner, use emojis, etc.' />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

            </fieldset>
            <fieldset>

                <FormField
                    control={form.control}
                    name="persona.personality"
                    render={({ field }) => (
                        <FormItem >
                            <FormLabel size="sm">Personality</FormLabel>
                            <FormControl>
                                <InputTags
                                    list={BotPersonalities}
                                    value={field.value || []}
                                    onChange={field.onChange}
                                    placeholder='professional, friendly, informative'
                                    className='border-foreground/5 shadow-none'
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </fieldset>
        </div>
    )
}
