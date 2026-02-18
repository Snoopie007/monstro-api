'use client'
import { Program, ProgramSession } from "@subtrees/types";
import { useCallback, useEffect, useState } from "react";
import {
    Collapsible, CollapsibleContent, CollapsibleTrigger,

    Empty, EmptyTitle, EmptyDescription
} from "@/components/ui";
import { ChevronRight, Loader2, Timer } from "lucide-react";
import { DaysOfWeek } from "../../schemas";
import SessionItem from "./SessionItem";

interface ProgramSessionsProps {
    program: Program;
    version?: number;
}

export function ProgramSessions({ program, version = 0 }: ProgramSessionsProps) {
    const [loading, setLoading] = useState(false);
    const lid = program.locationId;
    const [open, setOpen] = useState(false);
    const [sessions, setSessions] = useState<ProgramSession[]>([]);
    const [hasFetched, setHasFetched] = useState(false);

    useEffect(() => {
        if (open && !hasFetched) {
            getSessions();
        }
    }, [open, hasFetched]);

    // Refetch sessions when version changes (triggered by parent after session creation)
    useEffect(() => {
        if (open && version > 0) {
            getSessions();
        }
    }, [version]);

    async function getSessions() {
        setLoading(true);
        const PATH = `/api/protected/loc/${lid}/programs/${program.id}/sessions`;
        try {
            const res = await fetch(PATH);

            if (res.ok) {
                const data = await res.json();

                setSessions(data);
            } else {
                setSessions([]);
            }


            setHasFetched(true);
        } catch (error) {
            console.error("Error fetching sessions:", error);
            setSessions([]);
            setHasFetched(true);
        } finally {
            setLoading(false);
        }
    }



    const groupedSessions = useCallback(() => {
        const grouped: { [key: number]: ProgramSession[] } = {};

        sessions.forEach(session => {
            const day = session.day!;
            if (!grouped[day]) {
                grouped[day] = [];
            }
            grouped[day].push(session);
        });

        // Sort sessions within each day by time
        Object.keys(grouped).forEach(day => {
            grouped[parseInt(day)].sort((a, b) => a.time.localeCompare(b.time));
        });

        return grouped;
    }, [sessions]);

    return (
        <Collapsible className="border-t border-foreground/5 group px-4 pt-3 pb-2">
            <CollapsibleTrigger onClick={() => setOpen(!open)}>
                <div className="flex flex-row items-center gap-1">
                    <ChevronRight className="size-4 transition-transform duration-300 group-data-[state=open]:rotate-90 " />
                    <span className="text-sm font-medium">Sessions</span>
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pb-4 pt-2">
                {loading ? (
                    <div className="flex flex-row items-center justify-center gap-2 h-20">
                        <Loader2 className="size-4 animate-spin" />
                        <span className="text-sm font-medium">Loading sessions...</span>
                    </div>
                ) : (

                    hasFetched && sessions.length > 0 ? (
                        <div className="flex flex-col gap-4 ">
                            {Object.entries(groupedSessions()).map(([day, daySessions]) => (
                                <div key={day} className=" col-span-1  border-b border-foreground/5 pb-4   last:border-b-0">
                                    <div className="font-medium text-sm ">
                                        {DaysOfWeek[parseInt(day) - 1]}
                                    </div>
                                    <div className="flex flex-row gap-2">
                                        {daySessions.map((session: ProgramSession, i: number) => (
                                            <SessionItem key={i} session={session} lid={lid} availableStaff={[]} onRefetch={getSessions} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (

                        <Empty>
                            <EmptyTitle>No sessions found</EmptyTitle>
                            <EmptyDescription>Sessions will appear here when they are created</EmptyDescription>
                        </Empty>
                    )
                )}
            </CollapsibleContent>
        </Collapsible>


    )
}
