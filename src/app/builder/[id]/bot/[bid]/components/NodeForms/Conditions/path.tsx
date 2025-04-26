'use client'
import { UseFormReturn } from "react-hook-form"
import * as z from "zod"
import {
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
    Input
} from "@/components/forms"


import { useBotBuilder } from '../../../providers/AIBotProvider';
import { FieldOptionGroup, FieldOption } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/libs/utils";

import { ConditionNodeSchema } from "../schemas";

import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import {
    Collapsible, CollapsibleContent, CollapsibleTrigger,
    Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
    PopoverContent, PopoverTrigger, Popover
} from "@/components/ui"


const MathOperators = [
    { symbol: ">", label: "Greater than" },
    { symbol: "<", label: "Less than" },
    { symbol: "=", label: "Equal to" },
    { symbol: ">=", label: "Greater than or equal to" },
    { symbol: "<=", label: "Less than or equal to" },
]

const StringOperators = [
    { symbol: "is", label: "Is" },
    { symbol: "is not", label: "Is Not" },
    { symbol: "contains", label: "Contains" },
    { symbol: "does not contain", label: "Does Not Contain" },
    { symbol: "starts with", label: "Starts With" },
    { symbol: "ends with", label: "Ends With" },
    { symbol: "is empty", label: "Is Empty" },
    { symbol: "is not empty", label: "Is Not Empty" },
]

const BooleanOperators = [
    { symbol: 'true', label: "True" },
    { symbol: "false", label: "False" },
]

const ConditionOperators: { [key: string]: { symbol: string, label: string }[] } = {
    number: MathOperators,
    string: StringOperators,
    boolean: BooleanOperators
}



interface PathComponentProps {
    form: UseFormReturn<z.infer<typeof ConditionNodeSchema>>,
    i: number,
    extractionVariables: FieldOption[]
}

export default function PathComponent({ form, i, extractionVariables }: PathComponentProps) {
    const [operators, setOperators] = useState<{ symbol: string, label: string }[]>(StringOperators); // const [fieldType, setFieldType] = useState<string | number | boolean | null>(null);
    const [open, setOpen] = useState(false);
    const { variables } = useBotBuilder();
    const fieldOptions = [...variables, { group: "Extraction Variables", options: extractionVariables }]
    const operator = form.watch(`paths.${i}.options.path.condition.operator`);
    const fieldType = form.watch(`paths.${i}.options.path.condition.type`);


    useEffect(() => {
        if (fieldType) {
            setOperators(ConditionOperators[fieldType]);
        }
    }, [fieldType])

    const handleFieldChange = useCallback((value: 'string' | 'number' | 'boolean') => {
        form.setValue(`paths.${i}.options.path.condition.type`, value);

        setOperators(ConditionOperators[value]);
        setOpen(false);
    }, []);


    const requireValue = useMemo(() => {
        if (fieldType === "boolean") return false;
        if (operator === "is empty" || operator === "is not empty") return false;
        return true;
    }, [fieldType, operator]);

    return (

        <Collapsible defaultOpen={true}>
            <div className="grid grid-cols-10 gap-2">
                <Input type="hidden" {...form.register(`paths.${i}.options.path.condition.type`)} />
                <fieldset className="col-span-9">

                    < FormField
                        control={form.control}
                        name={`paths.${i}.node.label`}
                        render={({ field }) => (
                            <FormItem >
                                <FormControl>
                                    <Input className="rounded-xs border-foreground/10" placeholder="Path Name" {...field} />
                                </FormControl>
                                < FormMessage />
                            </FormItem>
                        )}
                    />

                </fieldset>
                <CollapsibleTrigger className="col-span-1 group" asChild>
                    <div className="flex items-center justify-center h-10 cursor-pointer ">
                        <ChevronDown className="size-4 hidden group-data-[state=open]:block" />
                        <ChevronUp className="size-4 group-data-[state=closed]:block hidden" />
                        <span className="sr-only">Toggle</span>
                    </div>
                </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="mt-2 ">
                <fieldset className="col-span-9 grid grid-cols-10 gap-1">
                    < FormField
                        control={form.control}
                        name={`paths.${i}.options.path.condition.field`}
                        render={({ field }) => (
                            <FormItem className="col-span-3 space-y-0" >
                                <Popover open={open} onOpenChange={setOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant="outline" role="combobox"
                                                className={cn("flex flex-row  w-full  border-0 items-center justify-between")}
                                            >
                                                <span>
                                                    {field.value ? field.value : "Select Variable"}
                                                </span>
                                                <ChevronDown size={14} />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className=" p-0">
                                        <Command>
                                            <CommandInput placeholder="Search variable..." />
                                            <CommandList>
                                                <CommandEmpty>No variables found.</CommandEmpty>
                                                {fieldOptions.map((group: FieldOptionGroup, index: number) => (
                                                    <CommandGroup key={index} className="text-xs space-y-1">
                                                        <p className="text-[0.6rem] uppercase font-medium text-muted-foreground">
                                                            {group.group}
                                                        </p>

                                                        {group.options.map((option) => (
                                                            <CommandItem key={option.key} className="text-xs"
                                                                onSelect={() => {
                                                                    field.onChange(option.key);
                                                                    handleFieldChange(option.type);
                                                                }}
                                                            >
                                                                {option.key}
                                                            </CommandItem>
                                                        ))}

                                                    </CommandGroup>
                                                ))}
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>


                                < FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`paths.${i}.options.path.condition.operator`}
                        render={({ field }) => (
                            <FormItem className="col-span-3 space-y-0" >
                                <Select onValueChange={(value) => (value && field.onChange(value))} defaultValue={field.value} value={field.value} >
                                    <FormControl>
                                        <SelectTrigger className="w-full text-left rounded-xs border-0 border-x" >
                                            <SelectValue placeholder="Operator" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {operators.map((operator) => (
                                            <SelectItem key={operator.symbol} value={operator.symbol} >
                                                {operator.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                < FormMessage />
                            </FormItem>
                        )}
                    />

                    {operator && (
                        <FormField
                            control={form.control}
                            name={`paths.${i}.options.path.condition.value`}
                            render={({ field }) => (
                                <FormItem className={
                                    fieldType === "boolean" ? "col-span-7" : "col-span-4"
                                } >

                                    <FormControl>
                                        {requireValue && (
                                            <Input className="border-0 rounded-none" placeholder="Value" {...field} />
                                        )}

                                    </FormControl>
                                    < FormMessage />
                                </FormItem>
                            )}
                        />
                    )}


                </fieldset>
            </CollapsibleContent>



        </Collapsible>
    )
}
