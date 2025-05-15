'use client'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
    Input
} from "@/components/forms"


import { useEffect, useState } from "react";
import { sleep, } from "@/libs/utils";
import { useReactFlow } from "@xyflow/react";
import { DelayNodeSchema } from "./schemas";
import NodeSettingFooter from "../ui/SettingFooter";
import { useBotUpdate } from "../../providers"


export function DelayNodeSettings() {
    const [loading, setLoading] = useState<boolean>(false);
    const { update, add, currentNode } = useBotUpdate();
    const { getNode } = useReactFlow();
    useEffect(() => {
        if (currentNode) {
            form.reset(currentNode.data)
        }
    }, [currentNode])

    const form = useForm<z.infer<typeof DelayNodeSchema>>({
        resolver: zodResolver(DelayNodeSchema),
        defaultValues: {
            label: '',
            delay: {
                mode: "exact",
                time: 0,
                interval: 0
            }
        },

        mode: "onChange",
    });


    async function handleUpdate(v: z.infer<typeof DelayNodeSchema>) {
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
                        <div className="p-4  space-y-4">
                            <fieldset className="grid grid-cols-10 gap-4">
                                <div className="col-span-4">
                                    <FormLabel  >Label</FormLabel>

                                </div>

                                <FormField
                                    control={form.control}
                                    name="label"
                                    render={({ field }) => (
                                        <FormItem className="col-span-6 ">
                                            <FormControl>
                                                <Input className="rounded-xs " placeholder="Node label... " {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>

                        </div>

                        <div className="border-t p-4  space-y-4">
                            <fieldset className="grid grid-cols-10 gap-4">
                                <div className="col-span-4">
                                    <FormLabel>Mode</FormLabel>

                                </div>

                                < FormField
                                    control={form.control}
                                    name="delay.mode"
                                    render={({ field }) => (
                                        <FormItem className="col-span-6 " >
                                            <Select onValueChange={(value) => {
                                                if (value !== '') {

                                                    field.onChange(value)
                                                }
                                            }} defaultValue={field.value} value={field.value} >
                                                <FormControl>
                                                    <SelectTrigger className="w-full rounded-xs" >
                                                        <SelectValue placeholder="Choose field..." autoCapitalize="words" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {[{ key: "exact", label: "Exact" }, { key: "interval", label: "Interval" }].map((option) => (
                                                        <SelectItem key={option.key} value={option.key} className="capitalize" >
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            < FormMessage />
                                        </FormItem>
                                    )}
                                />

                            </fieldset>
                            {form.getValues("delay.mode") === "exact" && (
                                <fieldset className="grid grid-cols-10 gap-4">
                                    <div className="col-span-4">
                                        <FormLabel>Delay Amount</FormLabel>
                                    </div>
                                    <div className="col-span-6">

                                    </div>
                                </fieldset>
                            )}

                        </div>

                    </form>
                </Form>
            </div>
            <NodeSettingFooter form={form} loading={loading} handleUpdate={handleUpdate} />
        </>
    )
}

