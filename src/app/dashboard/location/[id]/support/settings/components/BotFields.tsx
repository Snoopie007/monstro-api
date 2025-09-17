'use client'
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
    Input,
    Select,
    SelectTrigger,
    SelectValue,
    SelectItem,
    SelectContent,
    Slider,
} from "@/components/forms";
import { UseFormReturn } from "react-hook-form";
import { SupportBotSchema } from "@/libs/FormSchemas";
import { z } from "zod";
import { Editor, EditorContent, useEditor } from "@tiptap/react";
import {
    ScrollArea,
} from "@/components/ui";

import { SupportAssistant, CustomVariable } from "@/types";
import { useCallback } from "react";
import { VariableSelect } from "./VariableSelect";
import { SupportExtensionKit } from "@/components/extensions";
import { ExpandTextarea } from ".";
import { cn } from "@/libs/utils";
// import { PersonaComponent, KBComponent, ScenarioComp } from ".";
import Placeholder from "@tiptap/extension-placeholder";
import { useBotSettingContext } from "../provider";
import { PersonaFields } from "./PersonaFields";


const Models = [
    "anthropic", "gpt", "gemini"
]


interface BotFieldsProps {
    form: UseFormReturn<z.infer<typeof SupportBotSchema>>
    lid: string
}

export function BotFields({ form, lid }: BotFieldsProps) {
    const { assistant } = useBotSettingContext();


    const initialMessageEditor = useEditor({
        immediatelyRender: false,
        extensions: [...SupportExtensionKit(),
        Placeholder.configure({
            placeholder: 'Write something...',
        })],
        content: assistant?.initialMessage || '',
        onUpdate: ({ editor }) => {
            form.setValue("initialMessage", editor.getHTML())

        }
    });

    const promptEditor = useEditor({
        immediatelyRender: false,
        extensions: [...SupportExtensionKit(),
        Placeholder.configure({
            placeholder: 'Write something...',
        })],
        content: assistant?.prompt || '',
        onUpdate: ({ editor }) => {
            form.setValue("prompt", editor.getHTML())

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
            <form id={"newBotForm"} className="space-y-4 pb-10  ">


                <fieldset>
                    <FormField
                        control={form.control}
                        name="model"
                        render={({ field }) => (
                            <FormItem className='flex-1'>
                                <FormLabel size="sm">Model</FormLabel>
                                <Select onValueChange={(v) => {
                                    if (v) {
                                        field.onChange(v)

                                    }
                                }} value={field.value} defaultValue={'gpt'}>
                                    <FormControl>
                                        <SelectTrigger className="border-foreground/5 shadow-none">
                                            <SelectValue placeholder="Select a model" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {Models.map((item, i) => (
                                            <SelectItem key={i} value={item} className='cursor-pointer '>
                                                {item}

                                            </SelectItem>

                                        ))}
                                    </SelectContent>
                                </Select>

                                <FormMessage />
                            </FormItem>

                        )}
                    />
                </fieldset>
                <PersonaFields form={form} />
                {/* <ScenarioComp lid={lid} />
                <KBComponent lid={lid} docs={docs} /> */}

                <fieldset className="  space-y-1">
                    <div className="flex flex-row items-center justify-between">
                        <FormLabel size="sm">Prompt</FormLabel>
                        {promptEditor && (
                            <div className="flex flex-row gap-1">
                                <VariableSelect onSelect={(value) => {
                                    handleVariableSelect(value, promptEditor)
                                }} />
                                <ExpandTextarea type="Prompt" initialContent={promptEditor.getHTML()}
                                    onUpdate={promptEditor.commands.setContent} />
                            </div>
                        )}
                    </div>
                    <ScrollArea className="overflow-hidden bg-background  h-[100px] rounded-md ">
                        <EditorContent editor={promptEditor} />
                    </ScrollArea>
                </fieldset>
                <fieldset className=" rounded-sm space-y-1">
                    <div className="flex flex-row items-center justify-between">
                        <FormLabel size="sm">Initial Message</FormLabel>
                        {initialMessageEditor && (
                            <div className="flex flex-row gap-1">
                                <VariableSelect onSelect={(value) => {
                                    handleVariableSelect(value, initialMessageEditor)
                                }} />
                                <ExpandTextarea type="Initial Message" initialContent={initialMessageEditor.getHTML()}
                                    onUpdate={initialMessageEditor.commands.setContent} />
                            </div>
                        )}
                    </div>

                    <ScrollArea className="overflow-hidden bg-background  h-[80px] rounded-md ">
                        <EditorContent editor={initialMessageEditor} />
                    </ScrollArea>

                </fieldset>
                <fieldset>
                    <FormField
                        control={form.control}
                        name="temperature"
                        render={({ field }) => (
                            <FormItem className='space-y-1'>
                                <div className="flex flex-row items-center justify-between ">
                                    <FormLabel size="sm">Temperature</FormLabel>
                                    <p className="text-xs text-muted-foreground">{field.value}</p>
                                </div>
                                <FormControl >
                                    <Slider
                                        onValueChange={(value) => {
                                            field.onChange(value[0] || 0)
                                        }}
                                        value={field.value ? [field.value] : [0]}
                                        defaultValue={[0]}
                                        max={1}
                                        step={0.1}
                                        className={cn("w-full my-3")}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>

                        )}
                    />
                </fieldset>

            </form>
        </Form >
    )
}

