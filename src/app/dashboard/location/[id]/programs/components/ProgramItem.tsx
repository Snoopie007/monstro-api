"use client";
import { Program } from "@subtrees/types/program";
import { AvatarFallback } from "@/components/ui";
import ProgramActions from "./ProgramActions";
import { useState } from "react";
import { Avatar, AvatarImage, InfoField } from "@/components/ui";
import { ProgramSessions } from "./Sessions";

interface ProgramItemProps {
    program: Program;
    onDeleted?: () => void;
}

export function ProgramItem({ program, onDeleted }: ProgramItemProps) {
    const lid = program.locationId;
    const [sessionsVersion, setSessionsVersion] = useState(0);
    const refetchSessions = () => setSessionsVersion(v => v + 1);

    return (
        <div className="flex flex-col gap-2 bg-muted/50 border rounded-lg border-foreground/5 last:border-b-0">
            <div className="flex flex-row gap-4 items-center justify-between  p-4">
                <div className="flex-shrink-0">
                    <Avatar className="size-10">
                        <AvatarImage src={program.icon ?? ''} />
                        <AvatarFallback>
                            {program.name.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                </div>
                <div className="grid grid-cols-5 flex-1 gap-x-4 w-full">

                    <InfoField label="Program Name" className="col-span-1">
                        {program.name}
                    </InfoField>
                    <InfoField label="Status" className="col-span-1 gap-0.5">
                        <div className="flex flex-row items-center gap-2">
                            <div className={`size-2.5 rounded-full ${program.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                            {program.status}
                        </div>
                    </InfoField>
                    <InfoField label="Capacity" className="col-span-1">
                        {program.capacity}
                    </InfoField>
                    <InfoField label=" Age Range" className="col-span-1">
                        {program.minAge} - {program.maxAge}
                    </InfoField>
                </div>
                <div className="flex-shrink-0">
                    <ProgramActions program={program} lid={lid} onSessionCreated={refetchSessions} onDeleted={onDeleted} />
                </div>
            </div>
            <ProgramSessions program={program} version={sessionsVersion} />
            {/* <Collapsible open={open} onOpenChange={setOpen} className="border-t border-foreground/5 group px-4 pt-3 pb-2">
                <CollapsibleTrigger onClick={() => setOpen(!open)}>
                    <div className="flex flex-row items-center gap-1">
                        <ChevronRight className="size-4 transition-transform duration-300 group-data-[state=open]:rotate-90 " />
                        <span className="text-sm font-medium">More Details</span>
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="py-4">

                </CollapsibleContent>
            </Collapsible> */}



        </div>
    )
}
