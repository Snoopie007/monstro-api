'use client'

import { Edge, Node, useReactFlow } from "@xyflow/react";

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { FlowTemplate, NodeDataType, NodeSettings } from "@/types";
import { useBotBuilder, useHierarchy } from '../providers';
import { NodeSelectorContent, NodeSelectorDialog } from "./ui/SelectorDialog";
import {
    Bot,
    Clock,
    Database,
    LayoutTemplate,
    Split,
} from "lucide-react";
import { SetStateAction, Dispatch, useState } from "react";
import { DefaultPosition, Logics, Nodes, Templates } from "../data/templates";
import Image from "next/image";
import { nanoid } from "nanoid";
import { generateNodeId, updateHierarchy } from "../data/utils";
import { stratify } from "d3-hierarchy";

interface EdgeDialogProps {
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
}



function NodeSelector({ open, setOpen }: EdgeDialogProps) {
    const { setCurrentNode, currentEdge, hasChanged, updateInvalidNodes } = useBotBuilder();
    const [filter, setFilter] = useState<'All' | 'Nodes' | 'Templates' | 'Logics'>('All');
    const { setHierarchy } = useHierarchy();
    const { getNodes, setNodes } = useReactFlow();

    const nodes = getNodes();
    if (!currentEdge) return null;
    const { source, target } = currentEdge;
    // const sourceType = hierarchy.find((node) => node.id === source)?.data.type;

    // function isDisabled(templateType: string) {
    //     switch (templateType) {
    //         case 'Conditional Paths':
    //             return sourceType === 'path';
    //         default:
    //             return false
    //     }
    // }

    function handleTemplate(template: FlowTemplate) {
        const newNodes = templateToNodes(template, source, updateInvalidNodes);

        const targetIndex = nodes.findIndex((node) => node.id === target);
        nodes.splice(targetIndex, 0, ...newNodes);
        const parentId = newNodes[newNodes.length - 1].id;
        const { updatedHierarchy, updatedNodes } = updateHierarchy(nodes, parentId, target);
        setHierarchy(stratify<NodeSettings>()(updatedHierarchy));
        setNodes(updatedNodes);
        hasChanged(true);
        setOpen(false);
    }

    function handleNewNode(node: { label: string, value: string }) {
        setCurrentNode({
            type: node.value,
            parentId: source,
            node: { label: node.label },
            position: DefaultPosition
        });
        hasChanged(true);
        setOpen(false);
    }


    return (
        <NodeSelectorDialog open={open} onOpenChange={setOpen}>
            <NodeSelectorContent>
                <Command >

                    <CommandInput placeholder='Search templates & tools...' />
                    <div className="flex items-center  border-b w-full px-2 py-1.5 gap-2">
                        {['All', 'Nodes', 'Templates', 'Logics'].map((item) => (
                            <div key={item} className={`hover:bg-indigo-500 hover:text-white flex cursor-pointer items-center gap-1 px-3 font-medium py-0.5 text-xs border rounded-sm ${filter === item ? "bg-indigo-500 text-white" : ""}`}
                                onClick={() => setFilter(item as 'All' | 'Nodes' | 'Templates' | 'Logics')}
                            >
                                {item}
                            </div>
                        ))}
                    </div>
                    <CommandList className="p-2 px-1" >

                        <CommandEmpty>No objective found.</CommandEmpty>
                        <div className="space-y-2">
                            <CommandGroup title="Nodes" className={["Nodes", "All"].includes(filter) ? "px-2" : "hidden"}>
                                <p className="ml-2  text-xs  text-gray-600 uppercase mb-2">Nodes</p>
                                <div className="grid grid-cols-2 gap-1 " >
                                    {Nodes.map((node) => (
                                        <CommandItem key={node.value} value={node.value} onSelect={() => handleNewNode(node)}
                                            className="flex-1 items-start text-left flex-col [&_svg]:size-auto  cursor-pointer py-1.5 px-2 rounded-sm "
                                        >
                                            <SelectorItem label={node.label} />
                                        </CommandItem>
                                    ))}
                                </div>
                            </CommandGroup>
                            <CommandGroup title="Templates" className={["Templates", "All"].includes(filter) ? "px-2" : "hidden"}>
                                <p className="ml-2  text-xs  text-gray-600 uppercase mb-2">Templates</p>
                                <div className="grid grid-cols-2 gap-1 " >
                                    {Templates.map((template) => (
                                        <CommandItem key={template.label} value={template.label}
                                            onSelect={() => handleTemplate(template)}
                                            className="flex-1 items-start text-left flex-col [&_svg]:size-auto  cursor-pointer py-1.5 px-2 rounded-sm "
                                        >
                                            <SelectorItem label={template.label} />
                                        </CommandItem>
                                    ))}
                                </div>
                            </CommandGroup>
                            <CommandGroup title="Logics" className={["Logics", "All"].includes(filter) ? "px-2" : "hidden"}>
                                <p className="ml-2  text-xs  text-gray-600 uppercase mb-2">Logics</p>
                                <div className="grid grid-cols-2 gap-1 " >
                                    {Logics.map((logic) => (
                                        <CommandItem key={logic.value} value={logic.value} onSelect={() => handleNewNode(logic)}
                                            className="flex-1 items-start text-left flex-col [&_svg]:size-auto  cursor-pointer py-1.5 px-2 rounded-sm "
                                        >
                                            <SelectorItem label={logic.label} />
                                        </CommandItem>
                                    ))}
                                </div>
                            </CommandGroup>
                        </div>


                    </CommandList>
                </Command>
            </NodeSelectorContent>
        </NodeSelectorDialog >
    )
}



function templateToNodes(template: FlowTemplate, source: string, updateInvalidNodes: (nodeIds: string[]) => void) {
    const newNodes: Node<NodeDataType>[] = [];
    const groupParentId = generateNodeId();
    const invalidNodes: string[] = [];
    template.nodes.forEach((n, index) => {
        const { node, options, ...rest } = n;
        const id = index === 0 ? groupParentId : generateNodeId();

        newNodes.push({
            ...rest,
            id,
            data: {
                node: { ...node, groupParentId: groupParentId },
                options: options
            },
            parentId: index === 0 ? source : newNodes[newNodes.length - 1].id
        });
        if (n.node.editable) {
            invalidNodes.push(id);
        }
    });
    updateInvalidNodes(invalidNodes);
    return newNodes;
}

function SelectorItem({ label, img }: { label: string, img?: string }) {
    function getIcon(label: string) {
        const size = 16;
        const iconMap = {
            'ai': <Bot size={size} />,
            'condition': <Split size={size} />,
            'extraction': <Bot size={size} />,
            'delay': <Clock size={size} />,
            'retrieval': <Database size={14} />,
        };

        return iconMap[label as keyof typeof iconMap] || <LayoutTemplate size={size} />;
    }
    return (
        <div className='flex w-full flex-row items-center gap-2'>
            {!img ? (
                <div className=" text-indigo-600">
                    {getIcon(label)}
                </div>
            ) :
                <Image src={img} alt={label} className="size-4 rounded-full" />}
            <span className='text-xs capitalize text-foreground font-medium leading-none'>{label}</span>
        </div>
    )
}

export {
    NodeSelector
}