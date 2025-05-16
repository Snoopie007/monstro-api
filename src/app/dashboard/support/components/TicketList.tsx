'use client'

import { SupportTicket } from "@/types";
import { useRouter } from "next/navigation";
import { Input } from "@/components/forms";
import { format } from "date-fns";
import { cn } from "@/libs/utils";
import { useState } from "react";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui";
import { ChevronDownIcon, MoreHorizontalIcon } from "lucide-react";

const StatusTabs = ['All', 'Open', 'Pending', 'Closed'];
const SortTabs = ['Last Updated', 'Date Created', 'Serverity'];
export default function TicketList({ tickets }: { tickets: SupportTicket[] }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('All');

    const filteredTickets = tickets.filter(ticket => {
        if (activeTab === 'All') return true;
        return ticket.status === activeTab;
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-row gap-2 bg">
                <div className="flex-1">
                    <Input placeholder="Search..." className="bg-foreground/5 border border-foreground/10" />
                </div>
                <StatusTabGroup activeTab={activeTab} setActiveTab={setActiveTab} />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="bg-background flex items-center gap-2">
                            <span>  Sort by Last Updated</span>
                            <ChevronDownIcon className="size-4 " />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {SortTabs.map((tab) => (
                            <DropdownMenuItem key={tab}>
                                {tab}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {filteredTickets && filteredTickets.length > 0 ? (
                <ul>
                    {filteredTickets.map((ticket) => (
                        <TicketItem key={ticket.id} ticket={ticket} />
                    ))}
                </ul>
            ) : (
                <div className={cn(
                    "text-center text-sm text-muted-foreground rounded-sm min-h-[200px] flex items-center justify-center",
                    "bg-foreground/5 border border-foreground/10"
                )}>
                    No tickets found
                </div>
            )}
        </div>
    )
}

function StatusTabGroup({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) {
    return (
        <div className="flex items-center gap-1 bg-background border border-foreground/10 rounded-sm p-1">
            {StatusTabs.map((status) => (
                <div
                    key={status}
                    onClick={() => setActiveTab(status)}
                    className={cn(
                        "relative px-3 py-1.5 text-sm rounded-sm font-medium transition-colors",
                        "hover:text-foreground/80 z-10",
                        activeTab === status ? "text-foreground" : "text-foreground/60"
                    )}
                >
                    {status}
                    <div
                        className={cn(
                            "absolute inset-0 bg-foreground/5 rounded-sm transition-all duration-200",
                            activeTab === status ? "opacity-100" : "opacity-0"
                        )}
                    />
                </div>
            ))}
        </div>
    )
}

function TicketItem({ ticket }: { ticket: SupportTicket }) {
    return (
        <li className="border rounded-sm p-4 hover:bg-accent/50 transition-colors cursor-pointer">
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <span className="font-medium">{ticket.subject}</span>
                        <span className="text-sm text-muted-foreground">
                            {format(new Date(ticket.created), 'MMM d, yyyy')}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            {ticket.messagesCount} messages
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${ticket.status === 'Open' ? 'bg-green-500/20 text-green-500' :
                            ticket.status === 'Closed' ? 'bg-red-500/20 text-red-500' :
                                'bg-yellow-500/20 text-yellow-500'
                            }`}>
                            {ticket.status}
                        </span>
                    </div>
                </div>
            </div>
        </li>
    )
}
