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


import { useBotBuilder, useHierarchy } from '../../../providers/AIBotProvider';
import { NodeDataType, FieldOption, NodeSettings } from "@/types";
import { useEffect, useState } from "react";
import { cn, sleep, } from "@/libs/utils";

import { Node } from "@xyflow/react";
import { ConditionNodeSchema } from "../schemas";
import { endNodeTemplate } from "../../../data/templates";

import NodeSettingFooter from "../../ui/SettingFooter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { X } from "lucide-react";
import {
    SheetSection,
} from "@/components/ui"
import { generateNodeId, updateHierarchy } from "../../../data/utils"
import DefaultPath from "./default"
import PathComponent from "./path"
import { useReactFlow } from "@xyflow/react";
import { HierarchyNode, stratify } from "d3-hierarchy"


export function ConditionNodeSettings({ addNodes }: { addNodes: (nodes: Node<NodeDataType>[]) => void }) {
    const [loading, setLoading] = useState<boolean>(false);
    const { hierarchy, setHierarchy } = useHierarchy();
    const { hasChanged, currentNode, setCurrentNode, currentEdge } = useBotBuilder();
    const [extractionVariables, setExtractionVariables] = useState<FieldOption[]>([]);
    const { getNodes, setNodes } = useReactFlow();
    const nodes = getNodes();

    const form = useForm<z.infer<typeof ConditionNodeSchema>>({
        resolver: zodResolver(ConditionNodeSchema),
        defaultValues: {
            node: {
                label: 'Condition Name',

            },
            paths: [
                {
                    node: {
                        label: 'Path A',
                    },
                    options: {
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
                    node: {
                        label: 'Default Path',
                    },
                    options: {
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
        const current = hierarchy.find(node => node.id === currentNode?.id);
        let target = current;
        let extractionVariables: FieldOption[] = [];
        if (!current) {
            target = hierarchy.find(node => node.id === currentEdge?.target);
        }
        target?.ancestors().forEach((node) => {
            const { options, ...rest } = node.data;
            if (options?.extraction?.variables) {
                options.extraction.variables.forEach((v) => {
                    extractionVariables.push({
                        key: v.key,
                        type: v.returnType,
                    });
                });
            }
        });

        setExtractionVariables(extractionVariables);
        if (current && current.children) {
            const paths = current.children.map((node) => ({
                id: node.id,
                node: node.data.node,
                options: node.data.options,
            }));
            form.reset({
                node: current.data.node,
                paths
            }, { keepDefaultValues: false });
        };

    }, [currentNode])

    function calculateXPosition(index: number, totalPaths: number): number {
        if (totalPaths % 2 === 0) {
            return (index - (totalPaths - 1) / 2) * 250;
        }
        return (index % 2 === 0 ? 1 : -1) * ((index - (totalPaths - 1) / 2) * 250);
    };


    function updateParentCondition(parentPath: HierarchyNode<NodeSettings>, length: number) {
        const parentCondition = parentPath.parent
        if (!parentCondition) return;
        parentCondition.children?.forEach((child) => {
            if (child.id === parentPath.id) {
                console.log(child);
            }
        });
    }



    async function saveCondition(condition: z.infer<typeof ConditionNodeSchema>) {
        if (!currentNode) return;
        hasChanged(true);
        setLoading(true);
        const { node, ...rest } = currentNode;
        const parent = hierarchy.find((node) => node.id === (currentNode.parentId || currentEdge?.source));
        const conditionNode = { ...rest, data: { node: condition.node }, id: generateNodeId() };


        const parentPath = parent?.ancestors().find((node) => node.data.type === "path");
        if (parentPath) {
            updateParentCondition(parentPath, condition.paths.length);
        }

        if (currentNode.id) {
            const un = updateCondition(condition, conditionNode.id);
            const sourceIndex = nodes.findIndex((node) => node.id === currentNode?.id);
            nodes.splice(sourceIndex, nodes.length - 1, ...un);
            // Create a new hierarchy with the new nodes inserted at the correct position
            const parentId = un[un.length - 1].id;
            const { updatedHierarchy, updatedNodes } = updateHierarchy(nodes, parentId);

            // Update the state of the bot builder with the new hierarchy
            setHierarchy(stratify<NodeSettings>()(updatedHierarchy));
            setNodes([conditionNode, ...updatedNodes]);
        } else {
            const newNodes = processNewCondition(condition, conditionNode.id);
            addNodes([conditionNode, ...newNodes]);
        }


        await sleep(2000);
        setLoading(false);
    }


    function processNewCondition(condition: z.infer<typeof ConditionNodeSchema>, conditionId: string) {
        const newNodes: Node<NodeDataType>[] = [];
        const firstXPosition = calculateXPosition(0, condition.paths.length);
        condition.paths.forEach((path, i) => {
            const pathId = generateNodeId();
            const xPosition = i === 0 ? firstXPosition : firstXPosition + (i * 250);
            newNodes.push({ id: pathId, data: { ...path }, parentId: conditionId, position: { x: xPosition, y: 120 }, type: 'path' });
            if (i < condition.paths.length - 1) {
                newNodes.push({ ...endNodeTemplate, id: generateNodeId(), parentId: pathId });
            }
        });
        return newNodes;
    }


    function updateCondition(condition: z.infer<typeof ConditionNodeSchema>, conditionId: string) {

        const updatedNodes: Node<NodeDataType>[] = [];
        const firstXPosition = calculateXPosition(0, condition.paths.length);

        condition.paths.forEach((path, i) => {

            const xPosition = i === 0 ? firstXPosition : firstXPosition + (i * 250);
            const existing = hierarchy.find((node) => node.id === path.id);
            if (existing) {
                const { id, ...rest } = path;

                updatedNodes.push({
                    ...existing.data,
                    data: { ...rest },
                    position: { x: xPosition, y: 120 }
                });
                if (existing.children) {
                    existing.eachBefore((child) => {
                        if (child.id === existing.data.id) return;
                        const { node, options, ...rest } = child.data;
                        updatedNodes.push({ ...rest, data: { node: node } })
                    });
                }
            } else {
                const pathId = generateNodeId();
                updatedNodes.push({ id: pathId, data: { ...path }, parentId: conditionId, position: { x: xPosition, y: 120 }, type: 'path' });
                if (i < condition.paths.length - 1) {
                    updatedNodes.push({ ...endNodeTemplate, id: generateNodeId(), parentId: pathId });
                }
            }
        });
        return updatedNodes;
    }

    return (
        <Form {...form} >
            <form className="" >
                <ScrollArea className="h-[calc(100vh-100px)]">

                    <SheetSection>
                        <fieldset >
                            <FormField
                                control={form.control}
                                name="node.label"
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
                                    <input type="hidden" name={`paths.${i}.options.path.isDefault`} value={field.options.path.isDefault} />
                                    {field.options.path.isDefault ? (
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
                                    node: {
                                        label: `Path ${String.fromCharCode(65 + (fields.length - 2))}`,

                                    },
                                    options: {
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



