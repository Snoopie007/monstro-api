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


const SortTabs = ['Last Updated', 'Date Created', 'Serverity'];
const severityOrder = { undefined: 4, high: 3, medium: 2, low: 1 };
type Severity = keyof typeof severityOrder;

export function Caselist() {
    const { cases, isLoading, error } = useCases();
    const [sortBy, setSortBy] = useState('Last Updated');
    const [activeTab, setActiveTab] = useState('All');
    const [filteredCases, setFilteredCases] = useState<SupportCase[]>([]);



    useEffect(() => {
        if (!cases) return;
        let filtered = cases.filter((c: SupportCase) => {
            if (activeTab === 'All') return true;
            return c.status === activeTab.toLowerCase();
        });

        // Apply sorting
        filtered = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'Last Updated':
                    return new Date(b.updated).getTime() - new Date(a.updated).getTime();
                case 'Date Created':
                    return new Date(b.created).getTime() - new Date(a.created).getTime();
                case 'Serverity':
                    return severityOrder[b.severity as Severity] - severityOrder[a.severity as Severity];
                default:
                    return 0;
            }
        });

        setFilteredCases(filtered);
    }, [activeTab, cases, sortBy]);

    return (
        <div className="space-y-4">
            <div className="flex flex-row gap-2 bg">
                <div className="flex-1">
                    <Input placeholder="Search..." className="bg-foreground/5 border border-foreground/10" />
                </div>
                <StatusTabGroup activeTab={activeTab} setActiveTab={setActiveTab} />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className={cn("bg-background justify-between flex items-center",
                            "gap-2 text-xs border-foreground/10 min-w-44")}>
                            <span>Sort by {sortBy}</span>
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
                        <CaseItem key={c.id} c={c} />
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
                        <Link href={"/support/cases/new"}>
                            Create Case
                        </Link>
                    </Button>
                </div>
            )}
        </div>
    )
}



function CaseItem({ c }: { c: SupportCase }) {
    return (
        <li className="p-4  cursor-pointer hover:bg-accent/50 transition-colors border-b border-foreground/10 last:border-b-0">
            <div className="flex flex-row justify-between gap-2">
                <div className="flex flex-row gap-3 items-center">
                    <div className="flex flex-row gap-3 items-center">
                        <Badge size="tiny" status={c.status} className="rounded-full capitalize">
                            {c.status}
                        </Badge>
                        <Badge size="tiny" severity={c.severity} className="rounded-full capitalize">
                            Severity: {c.severity}
                        </Badge>

                    </div>
                    <div className="flex flex-row items-center gap-3">
                        <Link href={`/support/cases/case/${c.id}`} className="font-medium text-sm truncate">
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

                    <span >{c.metadata.firstName} {c.metadata.lastName}</span>

                    <span >
                        {format(new Date(c.created), 'MM/d/yy')}
                    </span>


                </div>
            </div>
        </li>
    )
}