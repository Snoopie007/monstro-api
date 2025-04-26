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

import { useBotBuilder, useHierarchy } from '../../providers/AIBotProvider';
import { useEffect, useState } from "react";
import { cn, sleep, } from "@/libs/utils";
import { RetrievalNodeSchema } from "./schemas";
import NodeSettingFooter from "../ui/SettingFooter";
import { Editor } from '@tiptap/core'
import { EditorContent } from '@tiptap/react'
import { ScrollArea } from "@/components/ui";
import { AIExtensionKit } from "@/components/extensions";
import { SheetSection } from "@/components/ui/sheet"
import { NodeSettingsProps } from "../NodeSettings";
import { APIFields } from "./RetrievalFields";
import { generateNodeId } from "../../data/utils"
import { WebsiteFields } from "./RetrievalFields/WebsiteFields"

export function RetrievalNodeSettings({ addNodes, updateNode }: NodeSettingsProps) {
    const [loading, setLoading] = useState<boolean>(false);

    const { hasChanged, currentNode } = useBotBuilder();
    const { hierarchy } = useHierarchy();

    const { options } = currentNode || {}
    const form = useForm<z.infer<typeof RetrievalNodeSchema>>({
        resolver: zodResolver(RetrievalNodeSchema),
        defaultValues: {
            node: {
                label: '',
            },
            options: {
                retrieval: {
                    knowledgeBase: options?.retrieval?.knowledgeBase,
                    goal: '',
                    maxAttempts: 3,
                    maxChars: 100,
                    instructions: '',
                    api: {
                        service: options?.retrieval?.api?.service,
                        action: options?.retrieval?.api?.action,
                        integrationId: options?.retrieval?.api?.integrationId,
                        calendarId: options?.retrieval?.api?.calendarId
                    }
                }
            }
        },
        mode: "onChange",
    });

    const knowledgeBase = form.watch("options.retrieval.knowledgeBase")
    useEffect(() => {
        if (currentNode) {
            form.reset(currentNode)
        }
    }, [currentNode])


    const goalEditor = new Editor({
        extensions: [...AIExtensionKit()],
        content: form.getValues("options.retrieval.goal") || '',
        onUpdate: ({ editor }) => {
            form.setValue("options.retrieval.goal", editor.getHTML())
        }
    });

    const instructionsEditor = new Editor({
        extensions: [...AIExtensionKit()],
        content: form.getValues("options.retrieval.instructions") || '',
        onUpdate: ({ editor }) => {
            form.setValue("options.retrieval.instructions", editor.getHTML())
        }
    })


    async function handleUpdate(v: z.infer<typeof RetrievalNodeSchema>) {
        if (!currentNode) return;
        setLoading(true);
        hasChanged(true);
        await sleep(2000);
        setLoading(false);
        if (currentNode.id) {
            updateNode(v);
        } else {
            const { node, options, ...rest } = currentNode;
            addNodes([{ ...rest, data: { ...v }, id: `${generateNodeId()}` }]);
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
                                    name="node.label"
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
                                    name="options.retrieval.knowledgeBase"
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
                                    name="options.retrieval.maxAttempts"
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
                                    name="options.retrieval.maxChars"
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
