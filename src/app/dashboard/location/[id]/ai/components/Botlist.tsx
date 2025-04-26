"use client"
import { useState } from "react";
import { useBots } from "@/hooks";
import { AIBot } from "@/types";
import { toast } from "react-toastify";
import { tryCatch } from "@/libs/utils";
import { motion } from "framer-motion";

import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
    ScrollArea,
    Button,
    Skeleton,
    Switch,
    Badge
} from "@/components/ui";
import Link from "next/link";
import { ChevronRight, CopyIcon, MessageCircleQuestion, Settings2Icon } from "lucide-react";
import { encodeId } from "@/libs/server/sqids";
import { format } from "date-fns";
import { AnimatePresence } from "framer-motion";
import { AIChat } from "./chat";
import { Location } from "@/types";


export function Botlist({ lid, location }: { lid: string, location: Location }) {
    const { bots, isLoading, error, mutate } = useBots(lid);
    const [selectedBot, setSelectedBot] = useState<AIBot | null>(null);

    if (error) {
        return <div className='text-red-500 h-full w-full flex flex-row items-center justify-center'>{error.message}</div>
    }

    async function toggleBotStatus(bot: AIBot) {
        if (bot.invalidNodes.length > 0 || !bot.objectives || bot.objectives.length < 1) {
            toast.error('Bot has invalid nodes, please fix them before toggling status');
            return;
        }

        const { result, error } = await tryCatch(
            fetch(`/api/protected/locations/${lid}/bots/${bot.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: bot.status === 'Active' ? 'Draft' : 'Active' }),
            })
        );

        if (error || !result || !result.ok) {
            toast.error(error?.message || "Something went wrong.");
            return;
        }

        await mutate();
    }
    return (
        <>
            <div className={`flex-1  border-r h-full`}>
                <div className=' px-4 flex flex-row justify-start items-center border-b  gap-2 py-2'>

                    <Button variant={"foreground"} size={"xs"} asChild>
                        <Link href={`/dashboard/location/${lid}/ai/new`}>
                            New Bot
                        </Link>
                    </Button>
                    <Button variant={"foreground"} size={"xs"} asChild>
                        <Link href={`/dashboard/location/${lid}/ai/knowledges`}>
                            Knowledge Base
                        </Link>
                    </Button>
                </div>
                <ScrollArea className=' '>
                    <Table className='border-b'>
                        <TableHeader>
                            <TableRow className='bg-transparent'>
                                {['Title', 'Bot Name', 'Objectives', 'Model', 'Created', 'Status'].map((header, i) => (
                                    <TableHead key={i} className=' h-9 border-r last:border-r-0 text-foreground  '>
                                        {header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>


                            {isLoading && (
                                <>
                                    <TableRow className='cursor-pointer  py-1 px-4 border-b w-full'>
                                        <TableCell colSpan={8}>
                                            <Skeleton className="w-full bg-gray-200  h-[15px] rounded-xs" />

                                        </TableCell>
                                    </TableRow>
                                    <TableRow className='cursor-pointer  py-1 px-4 border-b w-full'>
                                        <TableCell colSpan={8}>
                                            <Skeleton className="w-full bg-gray-200  h-[15px] rounded-xs" />

                                        </TableCell>
                                    </TableRow>
                                </>
                            )}
                            {!isLoading && bots.length < 1 && (
                                <TableRow className=' py-2 px-4 border-b w-full'>
                                    <TableCell colSpan={8} className='text-center text-gray-500 font-medium'>
                                        No bots found, create one.
                                    </TableCell>
                                </TableRow>
                            )}
                            {bots && bots.map((bot: any) => (

                                <TableRow
                                    key={bot.id}
                                    className='cursor-pointer border-b w-full '

                                >

                                    <TableCell className='border-r py-1 px-3 group'>
                                        <div className='flex flex-row items-center justify-between'>
                                            <div className='flex flex-row items-center gap-1'>
                                                <span className='text-sm'>{bot.title}</span>
                                                <Switch size={"sm"} checked={bot.status === 'Active'} onClick={() => toggleBotStatus(bot)} />
                                            </div>
                                            <div className='flex flex-row items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300'>
                                                <Button variant={'ghost'} size={'icon'} className='size-6 hover:bg-foreground/10 '
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(
                                                            `https://api.mymonstroapp.com/api/public/ai/${lid}/bot/${encodeId(bot.id)}`
                                                        );
                                                    }}
                                                >
                                                    <CopyIcon size={14} className="text-muted-foreground" />

                                                </Button>

                                                <Button variant={'ghost'} size={'icon'} className='size-6 hover:bg-foreground/10 ' asChild>
                                                    <Link href={`/dashboard/location/${lid}/ai/${bot.id}`}>
                                                        <Settings2Icon size={14} className="text-muted-foreground" />
                                                    </Link>
                                                </Button>

                                                <Button variant={'ghost'} size={'icon'} className='size-6 hover:bg-foreground/10 '
                                                    onClick={() => setSelectedBot(bot)}
                                                >
                                                    <MessageCircleQuestion className='size-4 text-muted-foreground' />
                                                </Button>
                                                <Button variant={'ghost'} size={'icon'} className='size-6 hover:bg-foreground/10' asChild>
                                                    <Link href={`/builder/${lid}/bot/${bot.id}`}>
                                                        <ChevronRight className='size-4 text-muted-foreground' />
                                                    </Link>

                                                </Button>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className='border-r'>
                                        {bot.botName}
                                    </TableCell>
                                    <TableCell className='border-r'>
                                        {bot.objectives ? bot.objectives.length : 0}
                                    </TableCell>
                                    <TableCell className='border-r'>{bot.model}</TableCell>
                                    <TableCell className='border-r'>{format(new Date(bot.created), 'MMM d, yyyy')}</TableCell>
                                    <TableCell className='flex flex-row items-center'>
                                        <Badge variant={bot.status === 'Active' ? 'active' : 'secondary'}>
                                            {bot.status}
                                        </Badge>
                                    </TableCell>

                                </TableRow>
                            ))}


                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
            <AnimatePresence mode="wait">
                {selectedBot && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{
                            width: "640px",
                            opacity: 1,
                            transition: {
                                width: { duration: 0.3, ease: "easeInOut" },
                                opacity: { duration: 0.2, delay: 0.1 }
                            }
                        }}
                        exit={{
                            width: 0,
                            opacity: 0,
                            transition: {
                                width: { duration: 0.3, ease: "easeInOut" },
                                opacity: { duration: 0.1 }
                            }
                        }}
                        className='overflow-hidden flex-initial h-full '>
                        <AIChat bot={selectedBot} setSelectedBot={setSelectedBot} location={location} lid={lid} />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
