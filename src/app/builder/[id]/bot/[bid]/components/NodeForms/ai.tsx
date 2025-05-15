'use client'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Input,
} from "@/components/forms"


import { useEffect, useState } from "react";
import { cn, sleep, } from "@/libs/utils";
import { AINodeSchema } from "./schemas";
import NodeSettingFooter from "../ui/SettingFooter";
import { Editor } from '@tiptap/core'
import { EditorContent } from '@tiptap/react'
import { ScrollArea } from "@/components/ui/ScrollArea";
import { AIExtensionKit } from "@/components/extensions";
import { SheetSection } from "@/components/ui/sheet"

import { useReactFlow } from "@xyflow/react";
import { useBotUpdate } from "../../providers"

export function AINodeSettings() {
    const [loading, setLoading] = useState<boolean>(false);
    const { currentNode, update, add } = useBotUpdate();
    const { getNode } = useReactFlow();

    const form = useForm<z.infer<typeof AINodeSchema>>({
        resolver: zodResolver(AINodeSchema),
        defaultValues: {
            label: '',
            ai: {
                goal: '',
                maxAttempts: 3,
                maxChars: 100,
                instructions: '',
            }

        },
        mode: "onChange",
    });



    useEffect(() => {
        if (currentNode) {
            form.reset({ ...currentNode.data })
        }
    }, [currentNode])

    const goalEditor = new Editor({
        extensions: [...AIExtensionKit()],
        content: form.getValues("ai.goal") || '',
        onUpdate: ({ editor }) => {
            form.setValue("ai.goal", editor.getHTML())
        }
    });

    const instructionsEditor = new Editor({
        extensions: [...AIExtensionKit()],
        content: form.getValues("ai.instructions") || '',
        onUpdate: ({ editor }) => {
            form.setValue("ai.instructions", editor.getHTML())
        }
    })



    async function handleUpdate(v: z.infer<typeof AINodeSchema>) {
        if (!currentNode) return;
        setLoading(true);
        await sleep(2000);
        setLoading(false);
        const current = getNode(currentNode.id);
        if (current) {
            update(v);
        } else {
            add([{ ...currentNode, data: { ...v } }]);
        }
    }


    return (
        <>
            <div className="w-full ">
                <Form {...form} >
                    <form className="">
                        <SheetSection>
                            <fieldset >
                                <FormField
                                    control={form.control}
                                    name="label"
                                    render={({ field }) => (
                                        <FormItem className="col-span-6 ">
                                            <FormLabel size="tiny" >Label</FormLabel>
                                            <FormControl>
                                                <Input className="rounded-xs " placeholder="Label" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                        </SheetSection>
                        <SheetSection>
                            <fieldset>
                                <FormItem>
                                    <FormLabel size="tiny">Goal</FormLabel>
                                    <FormControl>
                                        <ScrollArea className="h-[100px] overflow-hidden border rounded-xs">
                                            <EditorContent editor={goalEditor} className="h-full" />
                                        </ScrollArea>
                                    </FormControl>
                                    <FormDescription>
                                        Write a short sentance as to what you want AI to do.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            </fieldset>
                            <fieldset>
                                <FormItem>
                                    <FormLabel size="tiny">Additional Instructions</FormLabel>
                                    <ScrollArea className="h-[100px] overflow-hidden border rounded-xs">
                                        <EditorContent editor={instructionsEditor} className="h-full" />
                                    </ScrollArea>
                                </FormItem>
                            </fieldset>
                        </SheetSection>
                        <SheetSection>
                            <fieldset className="grid grid-cols-2 gap-2">
                                <FormField
                                    control={form.control}
                                    name="ai.maxAttempts"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size="tiny">Max Attempts</FormLabel>
                                            <FormControl>
                                                <Input type='number' className={cn("rounded-xs")} placeholder={''} {...field} />
                                            </FormControl>

                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="ai.maxChars"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size="tiny">Max Tokens</FormLabel>
                                            <FormControl>
                                                <Input type='number' className={cn("rounded-xs")} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>

                        </SheetSection>
                    </form>
                </Form>
            </div>
            <NodeSettingFooter form={form} loading={loading} handleUpdate={handleUpdate} />
        </>
    )
}
