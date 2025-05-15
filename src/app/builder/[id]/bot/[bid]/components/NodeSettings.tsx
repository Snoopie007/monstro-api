'use client'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

import {
    ExtractionNodeSettings,
    DelayNodeSettings,
    AINodeSettings,
    GHLIntegration,
    ConditionNodeSettings
} from "./NodeForms";
import { RetrievalNodeSettings } from "./NodeForms/retrieval";
import { useBotUpdate } from "../providers";
import { useEffect, useState } from "react";




export function NodeSettings() {
    const [open, setOpen] = useState(false);
    const { currentNode, setCurrentNode } = useBotUpdate();

    useEffect(() => {
        setOpen(!!currentNode)
    }, [currentNode])

    const renderNodeSettings = () => {
        if (!currentNode) return null;
        const nodeSettingsMap = {
            'ai': AINodeSettings,
            'extraction': ExtractionNodeSettings,
            'retrieval': RetrievalNodeSettings,
            'delay': DelayNodeSettings
        };

        const integrationSettingsMap = {
            'ghl': GHLIntegration
        }

        if (currentNode.type === 'integration') {
            const service = currentNode.data?.integration?.service;

            const ISC = integrationSettingsMap[service as keyof typeof integrationSettingsMap];
            if (ISC) {

                return <ISC />;
            } else {
                throw new Error(`Unknown integration service: ${service}`);
            }
        }

        if (currentNode.type === 'condition') {
            return <ConditionNodeSettings />;
        }

        const NodeSettingsComponent = nodeSettingsMap[currentNode.type as keyof typeof nodeSettingsMap];

        if (!NodeSettingsComponent) {
            throw new Error(`Unknown node type: ${currentNode.type}`);
        }

        return <NodeSettingsComponent />;
    };

    function handleOpenChange(open: boolean) {
        setOpen(open);
        if (!open) {
            setCurrentNode(null);
        }
    }
    return (
        <Sheet open={open} onOpenChange={handleOpenChange} >

            <SheetContent className="w-[550px] sm:max-w-[550px] sm:w-[550px] p-0" >
                <SheetHeader className=" border-foreground/5  border-b">
                    <SheetTitle >Update {currentNode?.data.label}</SheetTitle>
                    <SheetDescription className="hidden"></SheetDescription>
                </SheetHeader>
                {renderNodeSettings()}
            </SheetContent>
        </Sheet >
    )
}

