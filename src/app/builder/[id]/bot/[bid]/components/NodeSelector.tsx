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
import { NodeDataType, FlowTemplate } from "@/types";
import { useBotBuilder } from '../providers';
import { NodeSelectorContent, NodeSelectorDialog } from "./ui/SelectorDialog";
import {
    Bot,
    Clock,
    Database,
    LayoutTemplate,
    Split,
} from "lucide-react";
import { SetStateAction, Dispatch, useState } from "react";
import { Logics, Nodes, Templates } from "../data/templates";
import Image from "next/image";
import { generateNodeId } from "../data/utils";
import { useBotUpdate } from "../providers";




function NodeSelector({ open, setOpen }: { open: boolean, setOpen: Dispatch<SetStateAction<boolean>> }) {

    const { hasChanged } = useBotBuilder();
    const { setCurrentNode, currentEdge, add } = useBotUpdate();
    const [filter, setFilter] = useState<'All' | 'Nodes' | 'Templates' | 'Logics'>('All');
    const { getNode } = useReactFlow();
    const { invalidNodes } = useBotBuilder();


    function handleTemplate(template: FlowTemplate) {
        if (!currentEdge) return;

        const newNodes: Node<NodeDataType>[] = [];
        const newEdges: Edge[] = [];
        const groupParentId = generateNodeId();

        template.nodes.forEach((n, index) => {
            const { data, ...rest } = n;
            const id = index === 0 ? groupParentId : generateNodeId();

            newNodes.push({
                ...rest,
                id,
                data: {
                    ...data,
                    groupParentId: groupParentId
                },
                position: { x: 0, y: 0 }
            });
            if (index > 0) {
                newEdges.push({
                    id: `${newNodes[index - 1].id}->${id}`,
                    source: newNodes[index - 1].id,
                    target: id,
                    type: 'locked',
                });
            }
            if (n.data.editable) {
                invalidNodes.push(id);
            }
        });
        add(newNodes, newEdges);

        setOpen(false);
    }

    function handleNewNode(node: { label: string, value: string }) {

        if (!currentEdge) return;
        const parent = getNode(currentEdge.source);

        if (!parent) return;
        setCurrentNode({
            id: generateNodeId(),
            type: node.value,
            data: { label: node.label },
            position: { x: 0, y: 0 }
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