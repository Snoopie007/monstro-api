'use client'
import { zodResolver } from "@hookform/resolvers/zod"
import { FieldValues, useFieldArray, useForm } from "react-hook-form"
import * as z from "zod"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Input
} from "@/components/forms"

import { NodeDataType, FieldOption } from "@/types";
import { useEffect, useState } from "react";
import { cn, sleep, } from "@/libs/utils";

import { Edge, Node } from "@xyflow/react";
import { ConditionNodeSchema } from "../schemas";
import NodeSettingFooter from "../../ui/SettingFooter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { X } from "lucide-react";
import {
    SheetSection,
} from "@/components/ui"
import { generateNodeId } from "../../../data/utils"
import DefaultPath from "./default"
import PathComponent from "./path"
import { useReactFlow } from "@xyflow/react";
import { useBotUpdate } from "../../../providers"


export function ConditionNodeSettings() {
    const [loading, setLoading] = useState<boolean>(false);

    const [extractionVariables, setExtractionVariables] = useState<FieldOption[]>([]);
    const { getNodes, getEdges, updateNodeData } = useReactFlow<Node<NodeDataType>, Edge>();
    const { hierarchy, currentNode, currentEdge, add, updateFlow } = useBotUpdate();

    const form = useForm<z.infer<typeof ConditionNodeSchema>>({
        resolver: zodResolver(ConditionNodeSchema),
        defaultValues: {
            label: 'Condition Name',
            paths: [
                {
                    id: '',
                    data: {
                        label: 'Path A',
                        path: {
                            isDefault: false,
                            condition: {
                                operator: '',
                                field: '',
                                value: '',
                                type: undefined
                            }
                        }
                    }

                },
                {
                    data: {
                        label: 'Default Path',
                        path: {
                            isDefault: true,
                        }
                    }
                }
            ]
        },
        mode: "onChange",
    });

    const { fields, remove, insert } = useFieldArray({
        control: form.control,
        name: "paths",
    });

    useEffect(() => {
        if (!hierarchy) return;
        const current = hierarchy.find(node => node.id === currentNode?.id);
        let target = current;

        let extractionVariables: FieldOption[] = [];
        if (!current) {
            target = hierarchy.find(node => node.id === currentEdge?.target);
        }

        target?.ancestors().map((n) => n.data).forEach((node) => {
            const { data, ...rest } = node;
            if (data?.extraction?.variables) {
                data.extraction.variables.forEach((v) => {
                    extractionVariables.push({
                        key: v.key,
                        type: v.returnType,
                    });
                });
            }
        });

        setExtractionVariables(extractionVariables);

        if (current && current.children) {
            const paths = current.children.map((node) => (node.data));
            form.reset({
                label: current.data.data.label,
                paths
            }, { keepDefaultValues: false });
        };

    }, [currentNode])


    async function saveCondition(condition: z.infer<typeof ConditionNodeSchema>) {
        if (!currentNode || !hierarchy) return;
        setLoading(true);
        const { data, ...rest } = currentNode;
        const conditionNode = { ...rest, data: { label: condition.label } };
        const currentCondition = hierarchy.find(node => node.id === currentNode.id);


        if (currentCondition) {
            const nodes = getNodes();
            const edges = getEdges();
            updateNodeData(conditionNode.id, { label: condition.label })

            const newPaths = condition.paths.filter(path => !path.id || path.id === '');
            const existingPaths = condition.paths.filter(path => path.id && path.id !== '');
            const removedPaths = currentCondition.children?.filter(child => {
                return !existingPaths.some(path => path.id === child.data.id);
            });



            existingPaths.forEach((path) => {
                updateNodeData(path.id!, { ...path.data })
            });

            // TODO: Remove path from hierarchy
            // removedPaths?.forEach((path) => {

            // })
            const { newNodes, newEdges } = processNewCondition(newPaths, conditionNode.id);
            const defaultPathId = existingPaths.find(path => path.data.path.isDefault)?.id;
            const defaultPathIndex = nodes.findIndex(node => node.id === defaultPathId);
            if (defaultPathIndex !== -1) {
                const positionedNodes = [
                    ...nodes.slice(0, defaultPathIndex),
                    ...newNodes,
                    ...nodes.slice(defaultPathIndex)
                ];
                updateFlow(positionedNodes, [...edges, ...newEdges])
            }
        } else {
            const { newNodes, newEdges } = processNewCondition(condition.paths, conditionNode.id);
            add([conditionNode, ...newNodes], newEdges)
        }

        await sleep(2000);
        setLoading(false);
    }

    function processNewCondition(paths: Record<string, any>[], conditionId: string) {
        const newNodes: Node<NodeDataType>[] = [];
        const newEdges: Edge[] = [];

        paths.forEach((path, i) => {
            // Create path node
            const pathId = generateNodeId();
            newNodes.push({
                id: pathId,
                data: { label: path.data.label, path: path.data.path },
                position: { x: 0, y: 0 },
                type: 'path'
            });

            // Connect condition to path
            newEdges.push({
                id: `${conditionId}->${pathId}`,
                source: conditionId,
                target: pathId,
                animated: true,
                type: 'smoothstep'
            });

            if (!path.data.path.isDefault) {
                const endNodeId = generateNodeId();
                newNodes.push({
                    id: endNodeId,
                    data: { label: 'End' },
                    position: { x: 0, y: 0 },
                    type: 'end'
                });
                newEdges.push({
                    id: `${pathId}->${endNodeId}`,
                    source: pathId,
                    target: endNodeId,
                    type: 'plus'
                });
            }
        });
        return { newNodes, newEdges };
    }


    return (
        <Form {...form} >
            <form className="" >
                <ScrollArea className="h-[calc(100vh-100px)]">
                    <SheetSection>
                        <fieldset >
                            <FormField
                                control={form.control}
                                name="label"
                                render={({ field }) => (
                                    <FormItem >
                                        <FormLabel size="sm">Label</FormLabel>
                                        <FormControl>
                                            <Input className="rounded-xs " placeholder="Condition Name" {...field} />
                                        </FormControl>
                                        < FormMessage />
                                    </FormItem>
                                )}
                            />
                        </fieldset>
                    </SheetSection>
                    <SheetSection>
                        <div className="space-y-1">
                            <div className="text-sm  font-medium leading-none">CONDITION PATHS</div>
                            <div className="text-xs text-muted-foreground">
                                Add paths to the condition.
                            </div>
                        </div>
                        {fields.map((field: FieldValues, i: number) => {
                            return (
                                <fieldset key={i} className={cn("p-4 rounded-sm space-y-2 bg-foreground/5")} >
                                    <Button
                                        variant={"ghost"}
                                        size={"sm"}
                                        className={cn("text-red-500 h-auto p-0 absolute right-5 top-2", i > 1 ? "block" : "hidden")}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            remove(i)
                                        }}
                                    >
                                        <X size={14} />
                                    </Button>
                                    <input type="hidden" name={`paths.${i}.id`} value={field.id} />
                                    <input type="hidden" name={`paths.${i}.data.path.isDefault`} value={field.data.path.isDefault} />
                                    {field.data.path.isDefault ? (
                                        <DefaultPath form={form} i={i} />
                                    ) : (
                                        <PathComponent form={form} i={i} extractionVariables={extractionVariables} />
                                    )}
                                </fieldset>
                            )
                        })}
                        <Button
                            onClick={(e) => {
                                e.preventDefault();
                                insert(fields.length - 1, {
                                    data: {
                                        label: `Path ${String.fromCharCode(65 + (fields.length - 2))}`,
                                        path: {
                                            isDefault: false,
                                            condition: {
                                                operator: '',
                                                field: '',
                                                value: '',
                                                type: 'string'
                                            }
                                        }
                                    }
                                })
                            }}
                            variant={"foreground"} size={"sm"} className="rounded-sm "
                        >
                            + Path
                        </Button>

                    </SheetSection>


                </ScrollArea>
            </form>
            <NodeSettingFooter form={form} loading={loading} handleUpdate={saveCondition} />
        </Form>
    )
}



