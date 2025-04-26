'use client'
import { zodResolver } from "@hookform/resolvers/zod"
import { FieldValues, useFieldArray, useForm, UseFormReturn } from "react-hook-form"
import * as z from "zod"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
    Input,
    Textarea
} from "@/components/forms"



import { useBotBuilder } from '../../providers/AIBotProvider';
import { useEffect, useState } from "react";
import { cn, sleep, } from "@/libs/utils";
import { ExtractionNodeSchema } from "./schemas";
import NodeSettingFooter from "../ui/SettingFooter";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { MoveDiagonal, Trash2 } from "lucide-react";
import { SheetSection } from "@/components/ui";
import { NodeSettingsProps } from "../NodeSettings";
import { PreDefinedVariables } from "../../data/templates";
import { generateNodeId } from "../../data/utils"

export function ExtractionNodeSettings({ updateNode, addNodes }: NodeSettingsProps) {
    const [loading, setLoading] = useState<boolean>(false);
    const { hasChanged, currentNode } = useBotBuilder();

    const form = useForm<z.infer<typeof ExtractionNodeSchema>>({
        resolver: zodResolver(ExtractionNodeSchema),
        defaultValues: {
            node: {
                label: '',
            },
            options: {
                extraction: {
                    variables: []
                }
            }
        },

        mode: "onChange",
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "options.extraction.variables"
    })

    useEffect(() => {
        if (currentNode) {
            form.reset(currentNode)
        }
    }, [currentNode])

    async function handleUpdate(v: z.infer<typeof ExtractionNodeSchema>) {
        if (!currentNode) return;
        setLoading(true);
        hasChanged(true);

        const { node, options, ...rest } = currentNode;
        if (currentNode.id) {
            updateNode(v);
        } else {
            addNodes([{ ...rest, data: { node: { ...node, ...v.node }, options: v.options }, id: `${generateNodeId()}` }]);
        }

        await sleep(2000);
        setLoading(false);
    }

    return (
        <>
            <div className="w-full ">
                <ScrollArea className="h-[calc(100vh-100px)]">
                    <Form {...form} >
                        <form className="">
                            <SheetSection>
                                <fieldset className="">
                                    <FormField
                                        control={form.control}
                                        name="node.label"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel size="tiny">Label</FormLabel>
                                                <FormControl>
                                                    <Input className="rounded-xs " placeholder="Node label... " {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </fieldset>
                            </SheetSection>


                            <SheetSection>
                                <div className="flex flex-col gap-2">
                                    <div className="space-y-1">

                                        <div className="bg-foreground/10 p-3 rounded-sm text-sm">
                                            <b className="mb-2 block">How does this work?</b>
                                            <p >
                                                We can ask AI to extract information in to specific variables such as email, phone number, name, address, etc.
                                                That can be stored and used later in your bot.
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Select predefined variable or custom variable.</p>
                                        <Select onValueChange={(value) => {
                                            if (value !== '') {
                                                const variable = PreDefinedVariables.find(variable => variable.name === value);
                                                if (variable) {
                                                    append(variable.data);
                                                }
                                            }
                                        }}>
                                            <SelectTrigger className="w-full rounded-xs">
                                                <SelectValue placeholder="Select variable" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PreDefinedVariables.map((variable, i) => (
                                                    <SelectItem key={i} value={variable.name}>{variable.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="mt-2 bg-foreground/5 space-y-1 rounded-sm p-2">
                                    <div className="grid grid-cols-10 gap-1 items-center uppercase text-[0.65rem] font-medium">
                                        {["Variable", "Return type", "Description"].map((label, i) => (
                                            <div key={i} className="col-span-2">
                                                {label}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-1">
                                        {fields.map((field: FieldValues, i: number) => (
                                            <ExtractionVariables key={i} form={form} i={i} remove={remove} />
                                        ))}
                                    </div>

                                </div>

                            </SheetSection>


                        </form>
                    </Form>
                </ScrollArea>
            </div >
            <NodeSettingFooter form={form} loading={loading} handleUpdate={handleUpdate} />
        </>
    )
}

interface ExtractionVariablesProps {
    form: UseFormReturn<z.infer<typeof ExtractionNodeSchema>>,
    i: number,
    remove: (index: number) => void
}

function ExtractionVariables({ form, i, remove }: ExtractionVariablesProps) {
    const [expanded, setExpanded] = useState<boolean>(false);

    return (
        < div key={i} className={cn("relative ")} >


            <fieldset key={i} className="grid grid-cols-10 gap-1 items-center">

                <FormField
                    control={form.control}
                    name={`options.extraction.variables.${i}.key`}
                    render={({ field }) => (
                        <FormItem className="col-span-2 space-y-0">

                            <FormControl>
                                <Input className=" border-foreground/10 " placeholder="Variable name" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                < FormField
                    control={form.control}
                    name={`options.extraction.variables.${i}.returnType`}
                    render={({ field }) => (
                        <FormItem className="col-span-2 space-y-0" >

                            <Select onValueChange={(value) => {
                                if (value !== '') {
                                    field.onChange(value)
                                }
                            }} defaultValue={field.value} value={field.value} >
                                <FormControl>
                                    <SelectTrigger className="w-full border-foreground/10" >
                                        <SelectValue placeholder="Return type" autoCapitalize="words" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {[{ label: "Text", value: "string" }, { label: "Number", value: "number" }, { label: "True/False", value: "boolean" }].map((option) => (
                                        <SelectItem key={option.label} value={option.value} className="capitalize" >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            < FormMessage />
                        </FormItem>
                    )}
                />
                <div className="col-span-5 bg-background  flex flex-row justify-between border border-foreground/10 text-sm h-10 items-center rounded-sm  p-2 text-nowrap text-overflow-ellipsis">
                    <span className="flex-1">{form.watch(`options.extraction.variables.${i}.description`).slice(0, 35)}...</span>
                    <div className="justify-end text-muted-foreground flex  items-center flex-1" onClick={(e) => {
                        setExpanded(!expanded)
                    }}>
                        <MoveDiagonal size={13} />
                    </div>

                </div>
                <div className="col-span-1 flex flex-row items-center gap-1">

                    <div
                        className={cn("text-red-500 h-auto flex-1")}
                        onClick={(e) => {
                            remove(i)
                        }}
                    >
                        <Trash2 size={14} />
                    </div>
                </div>
            </fieldset>

            <fieldset className={cn("hidden  grid-cols-10 gap-1 items-center  mt-2  ", expanded && "grid")}>

                <FormField
                    control={form.control}
                    name={`options.extraction.variables.${i}.description`}
                    render={({ field }) => (
                        <FormItem className="col-span-9" >
                            <FormControl>
                                <Textarea className="rounded-sm border-foreground/10   resize-none" placeholder="Description... " {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </fieldset>
        </div>

    )
}
