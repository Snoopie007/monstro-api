'use client'
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormDescription,
    FormControl,
    FormMessage,
    Input,
    Textarea,
    Select,
    SelectTrigger,
    SelectValue,
    SelectItem,
    SelectContent,
    InputTags,
} from "@/components/forms";
import { UseFormReturn } from "react-hook-form";
import { AIBotSchema } from "./schemas";
import { z } from "zod";
import { Editor, EditorContent, useEditor } from "@tiptap/react";
import {
    ScrollArea,
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    Popover,
    PopoverContent,
    PopoverTrigger,
    Button,
} from "@/components/ui";
import { AIBot, CustomVariable, CustomVariableGroup } from "@/types";
import { useCallback, useState } from "react";
import { Tag } from "lucide-react";
import { DEFAULT_VARIABLE_GROUPS } from "@/libs/data";
import { AIExtensionKit } from "@/components/extensions";

const AIPersonalities = [
    "professional", "friendly", "informative",
    "funny", "serious", "casual", "formal", "sarcastic",
    "helpful", "confident", "humble", "bold", "shy"
]


interface BotFieldsProps {
    form: UseFormReturn<z.infer<typeof AIBotSchema>>
    bot?: AIBot
}
export function BotFields({ form, bot }: BotFieldsProps) {

    const initialMessageEditor = useEditor({
        immediatelyRender: false,
        extensions: [...AIExtensionKit()],
        content: bot?.initialMessage || '',
        onUpdate: ({ editor }) => {
            form.setValue("initialMessage", editor.getHTML())
        }
    });

    const reasonEditor = useEditor({
        immediatelyRender: false,
        extensions: [...AIExtensionKit()],
        content: bot?.reason || '',
        onUpdate: ({ editor }) => {
            form.setValue("reason", editor.getHTML())
        }
    });

    const responseDetailsEditor = useEditor({
        immediatelyRender: false,
        extensions: [...AIExtensionKit()],
        content: bot?.responseDetails || '',
        onUpdate: ({ editor }) => {
            form.setValue("responseDetails", editor.getHTML())
        }
    });


    const handleVariableSelect = useCallback((value: CustomVariable, editor: Editor | null) => {
        if (!editor) return;
        editor.chain().focus().insertContent({
            type: "mention",
            attrs: value
        }).run()
    }, []);

    return (
        <Form {...form} >
            <form id={"aiForm"} className="space-y-4  " >

                <fieldset className="bg-foreground/5 p-4 rounded-sm space-y-2">
                    <div className="space-y-1">
                        <FormLabel >General Information</FormLabel>
                        <FormDescription>Give this bot a title and a description.</FormDescription>
                    </div>



                    <div className="grid grid-cols-2 gap-2">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem >

                                    <FormControl>
                                        <Input type='text' placeholder="Bot Title"  {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>

                            )}
                        />
                        <FormField
                            control={form.control}
                            name="botName"
                            render={({ field }) => (
                                <FormItem className='col-span-1'>
                                    <FormControl>
                                        <Input type='text' placeholder="Bot Name"  {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                        control={form.control} name="description"
                        render={({ field }) => (
                            <FormItem >

                                <FormControl>
                                    <Textarea placeholder="Bot Description" className="resize-none " {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>

                        )}
                    />
                </fieldset>


                <fieldset className="bg-foreground/5 p-4 rounded-sm space-y-2 relative">
                    <div className="space-y-1">
                        <FormLabel >Personality</FormLabel>
                        <FormDescription>Give your bot a personality.</FormDescription>
                    </div>
                    <FormField
                        control={form.control}
                        name="personality"
                        render={({ field }) => (
                            <FormItem >
                                <FormControl>
                                    <InputTags list={AIPersonalities} value={field.value} onChange={field.onChange} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </fieldset>
                <fieldset className="bg-foreground/5 p-4 rounded-sm space-y-2">
                    <div className="space-y-1">
                        <FormLabel >Initial Message(Optional)</FormLabel>
                        <FormDescription>Provide an initial message for the bot.</FormDescription>
                    </div>

                    <div className="relative">
                        <div className="absolute top-[10px] right-[10px] z-10">
                            <VariableSelect onSelect={(value) => {
                                handleVariableSelect(value, initialMessageEditor)
                            }} />
                        </div>
                        <ScrollArea variant={"textarea"} className="p-2">
                            <EditorContent editor={initialMessageEditor} className="h-[100px] bg-background" />
                        </ScrollArea>
                    </div>
                </fieldset>


                <fieldset className="bg-foreground/5 p-4 rounded-sm space-y-2">


                    <div className="space-y-1">
                        <FormLabel >Reason for Conversation</FormLabel>
                        <FormDescription>Provide a reason for the conversation.</FormDescription>
                    </div>
                    <div className="relative">
                        <div className="absolute top-[10px] right-[10px] z-10">
                            <VariableSelect onSelect={(value) => {
                                handleVariableSelect(value, reasonEditor)
                            }} />
                        </div>
                        <ScrollArea variant={"textarea"} className="p-2">
                            <EditorContent editor={reasonEditor} className="h-[200px] bg-background" />
                        </ScrollArea>
                    </div>
                </fieldset>


                <fieldset className="bg-foreground/5 p-4 rounded-sm space-y-2">
                    <div className="space-y-1">
                        <FormLabel>Response Instructions</FormLabel>
                        <FormDescription>Provide instructions for the response.</FormDescription>
                    </div>
                    <div className="relative">
                        <div className="absolute top-[10px] right-[10px] z-10">
                            <VariableSelect onSelect={(value) => {
                                handleVariableSelect(value, responseDetailsEditor)
                            }} />
                        </div>
                        <ScrollArea variant={"textarea"} className="p-2">
                            <EditorContent editor={responseDetailsEditor} className="h-[300px] bg-background" />
                        </ScrollArea>
                    </div>

                    <FormMessage />
                </fieldset>

                <fieldset className=" space-y-2 bg-foreground/5 p-4 rounded-sm">
                    <div className="space-y-1">
                        <FormLabel >Additional Settings</FormLabel>
                        <FormDescription>These are optional settings.</FormDescription>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border p-2 rounded-sm bg-background">
                        <FormField
                            control={form.control}
                            name="maxTokens"
                            render={({ field }) => (
                                <FormItem className='flex-1'>
                                    <FormLabel size="tiny">Max Token</FormLabel>
                                    <FormControl>
                                        <Input
                                            type='number'
                                            className='rounded-xs'
                                            value={field.value}
                                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>

                            )}
                        />
                        <FormField
                            control={form.control}
                            name="temperature"
                            render={({ field }) => (
                                <FormItem className='flex-1'>
                                    <FormLabel size="tiny">Temperature</FormLabel>
                                    <FormControl>
                                        <Input type='number' className='rounded-xs' {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>

                            )}
                        />
                        <FormField
                            control={form.control}
                            name="model"
                            render={({ field }) => (
                                <FormItem className='flex-1'>
                                    <FormLabel size="tiny">AI Model</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select an AI model" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {["gpt-4", "gpt-3.5-turbo", "gpt-4o-mini"].map((item, i) => (
                                                <SelectItem key={i} value={item} className='cursor-pointer'>{item}</SelectItem>

                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <FormMessage />
                                </FormItem>

                            )}
                        />
                    </div>
                </fieldset>
            </form>
        </Form >)
}


interface VariableSelectProps {
    variables?: CustomVariableGroup[]
    onSelect: (value: CustomVariable) => void
}


function VariableSelect({ variables, onSelect }: VariableSelectProps) {
    const [open, setOpen] = useState(false)
    const [value, setValue] = useState("")
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    role="combobox"
                    size="icon"
                    aria-expanded={open}
                    className="size-6"
                >

                    <Tag size={14} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder="Search variables..." />
                    <CommandList>
                        <CommandEmpty>No variables found.</CommandEmpty>

                        {[...DEFAULT_VARIABLE_GROUPS, ...(variables || [])].map((group) => (
                            <CommandGroup key={group.name}>
                                <p className="text-[0.6rem] font-medium text-muted-foreground uppercase">{group.name}</p>
                                {group.variables.map((v: CustomVariable) => (
                                    <CommandItem
                                        key={v.id}
                                        value={v.value}
                                        onSelect={() => {
                                            onSelect(v)
                                            setOpen(false)
                                        }}
                                    >
                                        <p>{v.label}</p>
                                    </CommandItem>
                                ))}
                            </CommandGroup>

                        ))}

                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

