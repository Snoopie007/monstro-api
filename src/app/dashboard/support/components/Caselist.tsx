'use client'

import { Input } from "@/components/forms";
import { format } from "date-fns";
import { cn } from "@/libs/utils";
import { useEffect, useState } from "react";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Skeleton, Badge } from "@/components/ui";
import { ChevronDownIcon, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useCases } from "@/hooks";
import { SupportCase } from "@/types/admin";
import { StatusTabGroup } from "./CaseStatusTabs";
import { useSession } from "next-auth/react";
import { ExtendedUser } from "@/types/next-auth";


const SortTabs = ['Last Updated', 'Date Created', 'Serverity'];

export function Caselist() {
    const { cases, isLoading, error } = useCases();
    const [sortBy, setSortBy] = useState('Last Updated');
    const [activeTab, setActiveTab] = useState('All');
    const [filteredCases, setFilteredCases] = useState<SupportCase[]>([]);
    const { data: session } = useSession();

    useEffect(() => {
        if (!cases) return;
        const filteredCases = cases.filter((c: SupportCase) => {
            if (activeTab === 'All') return true;
            return c.status === activeTab.toLowerCase();
        });
        setFilteredCases(filteredCases);
    }, [activeTab, cases]);

    return (
        <div className="space-y-4">
            <div className="flex flex-row gap-2 bg">
                <div className="flex-1">
                    <Input placeholder="Search..." className="bg-foreground/5 border border-foreground/10" />
                </div>
                <StatusTabGroup activeTab={activeTab} setActiveTab={setActiveTab} />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="bg-background flex items-center gap-2 text-xs">
                            <span>  Sort by {sortBy}</span>
                            <ChevronDownIcon className="size-4 " />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {SortTabs.map((tab) => (
                            <DropdownMenuItem key={tab} onClick={() => setSortBy(tab)}>
                                {tab}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {isLoading && (
                <div className="flex flex-col gap-2 items-center">
                    <Skeleton className="w-full h-20 rounded-sm" />

                </div>
            )}
            {cases && (
                <ul className="border rounded-sm border-foreground/10">
                    {filteredCases.map((c: SupportCase) => (
                        <CaseItem key={c.id} c={c} user={session?.user} />
                    ))}
                </ul>
            )}
            {cases && filteredCases.length === 0 && (
                <div className={cn(
                    "text-center text-sm text-muted-foreground rounded-sm min-h-[200px] flex flex-col items-center justify-center",
                    "bg-foreground/5 border border-foreground/10 gap-2"
                )}>
                    <p>No cases found</p>
                    <Button variant="outline" className="bg-transparent text-foreground hover:bg-transparent hover:border-foreground" size="sm" asChild>
                        <Link href={"/dashboard/support/new"}>
                            Create Case
                        </Link>
                    </Button>
                </div>
            )}
        </div>
    )
}



function CaseItem({ c, user }: { c: SupportCase, user: ExtendedUser }) {
    return (
        <li className="p-4  cursor-pointer hover:bg-accent/50 transition-colors border-b border-foreground/10 last:border-b-0">
            <div className="flex flex-row justify-between gap-2">
                <div className="flex flex-row gap-3 items-center">
                    <div className="flex flex-row gap-3 items-center">
                        <Badge size="tiny" variant="default" className="rounded-full capitalize">
                            {c.status}
                        </Badge>
                        <Badge size="tiny" severity={c.severity} className="rounded-full capitalize">
                            Severity: {c.severity}
                        </Badge>

                    </div>
                    <div className="flex flex-row items-center gap-3">
                        <Link href={`/dashboard/support/case/${c.id}`} className="font-medium text-sm truncate">
                            {c.subject}
                        </Link>
                        <div className="text-sm text-muted-foreground flex flex-row items-center gap-1">
                            <MessageCircle className="size-3" />
                            <span className="pt-0.5">{c.messagesCount || 0}</span>
                        </div>
                    </div>

                </div>
                <div className="flex items-center text-sm text-muted-foreground  gap-2">
                    <span>#{c.id}</span>

                    <span >{user?.name}</span>

                    <span >
                        {format(new Date(c.created), 'MM/d/yy')}
                    </span>


                </div>
            </div>
        </li>
    )
}