'use client';

import { Button } from "@/components/ui/button";
import { useBotBuilder } from "../providers/AIBotProvider";
import { cn, sleep, tryCatch } from "@/libs/utils";
import { ChevronLeft, Loader2, Moon, Settings2Icon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { MouseEvent, useState, useEffect, useRef } from "react";

import { toast } from "react-toastify";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui"
import { useTheme } from "next-themes";
import { AIBot } from "@/types";
import Link from "next/link";
import { Switch } from "@/components/ui";
import { useReactFlow } from "@xyflow/react";

interface BotSettingsProps {
    bot: AIBot;
    lid: string;
}

const BTN_STYLE = "rounded-none h-10 bg-foreground py-0 hover:bg-indigo-900 text-background hover:text-white"
const AUTO_SAVE_INTERVAL = 20 * 60 * 1000; // 20 minutes

export function BotSettings({ lid, bot }: BotSettingsProps) {
    const { theme, setTheme } = useTheme()
    const { changed, invalidNodes, hasChanged } = useBotBuilder();
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const { push } = useRouter();
    const [currentBot, updateBot] = useState<AIBot>(bot);
    const lastSaveTime = useRef(Date.now());
    const { getNodes, getEdges } = useReactFlow();

    useEffect(() => {
        const interval = setInterval(() => {
            if (Date.now() - lastSaveTime.current >= AUTO_SAVE_INTERVAL) {
                autoSave();
                lastSaveTime.current = Date.now();
            }
        }, AUTO_SAVE_INTERVAL);

        return () => clearInterval(interval);
    }, [getNodes, invalidNodes.length, changed]);

    async function autoSave() {
        if (invalidNodes.length !== 0 || !changed) return;
        await update();
    }

    async function update() {
        const nodes = getNodes();
        const edges = getEdges();
        const objectives = nodes.map(node => {
            const { data, ...rest } = node;
            const edge = edges.find(edge => edge.target === rest.id);
            return {
                id: rest.id,
                position: rest.position,
                ...(edge?.source ? { parentId: edge.source } : {}),
                type: rest.type,
                data
            }
        });

        setLoading(true);
        await sleep(2000);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/locations/${lid}/bots/${bot.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    objectives,
                    invalidNodes: invalidNodes
                }),
            })
        );
        setLoading(false);
        if (error || !result || !result.ok) {

            return toast.error(error?.message || "Something went wrong.");
        }

        const data = await result.json();
        updateBot(data);
        hasChanged(false);
        toast.success("Bot Updated");
        lastSaveTime.current = Date.now();
    }

    async function save(e?: MouseEvent<HTMLButtonElement>) {
        e?.preventDefault();
        if (invalidNodes.length !== 0) {
            return toast.error("There are incomplete nodes. Please complete them before saving.");
        }
        await update();
    }

    async function handleStatusChange(checked: boolean) {
        if (invalidNodes.length !== 0) {
            return toast.error("There are incomplete nodes. You cannot turn on the bot until all nodes are fixed.");
        }

        const { result, error } = await tryCatch(
            fetch(`/api/protected/locations/${lid}/bots/${bot.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: checked ? "Active" : "Draft" }),
            })
        );

        if (error || !result || !result.ok) {
            return toast.error(error?.message || "Something went wrong.");
        }

        const data = await result.json();
        updateBot(data);
        toast.success("Your bot is now" + (checked ? " live" : " draft"));
    }

    function handleBack() {
        if (changed) {
            setOpen(true);
        } else {
            push(`/dashboard/locations/profile/${lid}/ai`);
        }
    }

    function isDraft() {
        return currentBot.status === "Draft";
    }

    return (
        <div className='fixed top-4 left-5 z-20 rounded-md shadow-md overflow-hidden'>
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>You've Unsaved Changes!</AlertDialogTitle>
                        <AlertDialogDescription>
                            You have unsaved changes. Are you sure you want to leave? You'll lose all your changes.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-sm">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => push(`/dashboard/locations/profile/${lid}/ai`)} className="rounded-sm">Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className='flex flex-row h-full items-center'>
                <Button variant={"ghost"} className={BTN_STYLE} onClick={handleBack}>
                    <ChevronLeft size={16} />
                </Button>


                <div className="border-x border-background/5 flex-initial bg-foreground flex flex-row items-center font-medium h-10 px-2">
                    <div className="text-background flex flex-row items-center gap-1">
                        <span className="text-xs">{currentBot.title}</span>
                        {isDraft() ?
                            <span className="bg-gray-300 text-black rounded-full px-2 py-0.5 text-[0.6rem]">
                                Draft
                            </span>
                            :
                            <span className="bg-green-300 text-black rounded-full px-2 py-0.5 text-[0.6rem]">
                                Active
                            </span>
                        }
                    </div>
                </div>

                <div className="flex flex-row items-center gap-2 px-2 h-10 bg-foreground border-x border-background/10">
                    <Switch onCheckedChange={handleStatusChange} checked={!isDraft()} className="dark:data-[state='unchecked']:bg-gray-200" />
                </div>

                <Button
                    variant={"ghost"}
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className={cn(BTN_STYLE, "cursor-pointer text-white dark:text-black")}
                >
                    <Sun size={14} className="dark:hidden" />
                    <Moon size={14} className="hidden dark:block" />
                </Button>

                <Button variant={'ghost'} className={cn(BTN_STYLE, 'border-x border-background/10')} asChild>
                    <Link href={`/dashboard/locations/profile/${lid}/ai/${bot.id}?from=builder`}>
                        <Settings2Icon size={14} />
                    </Link>
                </Button>

                <Button
                    variant={"ghost"}
                    size={"sm"}
                    onClick={save}
                    disabled={invalidNodes.length !== 0 || loading || !changed}
                    className={cn(
                        BTN_STYLE,
                        "children:hidden disabled:opacity-90 disabled:text-gray-400",
                        { 'children:inline-block': loading }
                    )}
                >
                    <Loader2 size={14} className="animate-spin mr-2" />
                    Save
                </Button>
            </div>
        </div>
    )
}
