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
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem
} from "@/components/forms"

import { useEffect, useState } from "react";
import { cn, sleep, } from "@/libs/utils";
import { RetrievalNodeSchema } from "./schemas";
import NodeSettingFooter from "../ui/SettingFooter";
import { Editor } from '@tiptap/core'
import { EditorContent } from '@tiptap/react'
import { ScrollArea } from "@/components/ui/ScrollArea";
import { AIExtensionKit } from "@/components/extensions";
import { SheetSection } from "@/components/ui/sheet"
import { APIFields } from "./RetrievalFields";
import { WebsiteFields } from "./RetrievalFields/WebsiteFields"
import { useBotUpdate } from "../../providers"
import { useReactFlow } from "@xyflow/react"

export function RetrievalNodeSettings() {
    const [loading, setLoading] = useState<boolean>(false);
    const { update, add, currentNode } = useBotUpdate();
    const { getNode } = useReactFlow();

    const { data } = currentNode || {}
    useEffect(() => {
        if (currentNode) {
            form.reset(currentNode.data)
        }
    }, [currentNode])

    const form = useForm<z.infer<typeof RetrievalNodeSchema>>({
        resolver: zodResolver(RetrievalNodeSchema),
        defaultValues: {
            label: '',
            retrieval: {
                knowledgeBase: data?.retrieval?.knowledgeBase,
                goal: '',
                maxAttempts: 3,
                maxChars: 100,
                instructions: '',
                api: {
                    service: data?.retrieval?.api?.service,
                    action: data?.retrieval?.api?.action,
                    integrationId: data?.retrieval?.api?.integrationId,
                    calendarId: data?.retrieval?.api?.calendarId
                }
            }
        },
        mode: "onChange",
    });

    const knowledgeBase = form.watch("retrieval.knowledgeBase")



    const goalEditor = new Editor({
        extensions: [...AIExtensionKit()],
        content: form.getValues("retrieval.goal") || '',
        onUpdate: ({ editor }) => {
            form.setValue("retrieval.goal", editor.getHTML())
        }
    });

    const instructionsEditor = new Editor({
        extensions: [...AIExtensionKit()],
        content: form.getValues("retrieval.instructions") || '',
        onUpdate: ({ editor }) => {
            form.setValue("retrieval.instructions", editor.getHTML())
        }
    })


    async function handleUpdate(v: z.infer<typeof RetrievalNodeSchema>) {
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
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="label"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size="tiny">Node Label</FormLabel>
                                            <FormControl>
                                                <Input type="text" placeholder="Enter Node Label" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                        </SheetSection>
                        <SheetSection>
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="retrieval.knowledgeBase"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size="tiny">Knowledge Base</FormLabel>
                                            <FormControl>
                                                <Select value={field.value} onValueChange={(value: string) => {
                                                    field.onChange(value)
                                                }}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a knowledge base" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {["website", "api", "internal"].map((option) => (
                                                            <SelectItem key={option} value={option} >
                                                                <span className={cn("capitalize", { "uppercase": "api" === option })}>{option} </span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            {knowledgeBase === "api" && <APIFields form={form} />}
                            {knowledgeBase === "website" && <WebsiteFields form={form} />}
                        </SheetSection>
                        <SheetSection>
                            <fieldset>
                                <FormItem>
                                    <FormLabel size="tiny">Goal</FormLabel>
                                    <div className="flex flex-col gap-1">
                                        <ScrollArea variant="textarea">
                                            <EditorContent editor={goalEditor} className="h-full" />
                                        </ScrollArea>
                                        <FormDescription className="text-xs" >
                                            Describe the goal you want the AI to achieve. Be specific and concise and include the context of the goal.
                                        </FormDescription>
                                    </div>
                                </FormItem>
                            </fieldset>
                            <fieldset>
                                <FormItem>
                                    <FormLabel size="tiny">Instructions</FormLabel>
                                    <div className="flex flex-col gap-1">
                                        <ScrollArea variant="textarea">
                                            <EditorContent editor={instructionsEditor} className="h-full" />
                                        </ScrollArea>
                                        <FormDescription className="text-xs" >
                                            Describe the instructions you want the AI to follow. Be specific and concise and include the context of the instructions.
                                        </FormDescription>
                                    </div>
                                </FormItem>
                            </fieldset>

                        </SheetSection>
                        <SheetSection>
                            <fieldset className="grid grid-cols-2 gap-2">
                                <FormField
                                    control={form.control}
                                    name="retrieval.maxAttempts"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size="tiny">Max Attempts</FormLabel>
                                            <FormControl>
                                                <Input type='number' placeholder={''} {...field} />
                                            </FormControl>

                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="retrieval.maxChars"
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
