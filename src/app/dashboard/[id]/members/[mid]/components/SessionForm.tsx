import {
    Button,
    DialogBody,
    DialogFooter,
    DialogClose,
    Switch
} from "@/components/ui";

import { useEffect, useState } from "react";
import { Clock, Loader2 } from "lucide-react";
import { cn, formatTime, tryCatch } from "@/libs/utils";
import { useMemo, useCallback } from "react";
import { MemberPackage, MemberPlan, MemberSubscription, ProgramLevel, ProgramSession } from "@/types";
import { DAYS } from "../schema";
import { PulsingStatus } from "@/components/ui/PulsingStatus";
import { toast } from "react-toastify";

export type SubPackageProgress = {
    step: number,
    plan: MemberPlan | undefined,
    level: ProgramLevel | undefined,
    packageId: number | undefined,
    subscriptionId: number | undefined,
}

export type SessionFormProps = {
    params: { id: string, mid: number },
    progress: SubPackageProgress,
}

export const DEFAULT_PROGRESS: SubPackageProgress = {
    step: 1,
    plan: undefined,
    level: undefined,
    packageId: undefined,
    subscriptionId: undefined
}


export function SessionForm({ params, progress }: SessionFormProps) {

    const [loading, setLoading] = useState(false);
    const [groupedSessions, setGroupedSessions] = useState<Map<number, ProgramSession[]>>(new Map());
    // const [repeat, setRepeat] = useState<boolean>(false);
    const [selectedSessions, setSelectedSessions] = useState<number[]>([]);
    const [selectedDay, setSelectedDay] = useState<number>(1);
    const [sessions, setSessions] = useState<ProgramSession[]>([]);

    useEffect(() => {
        fetchSessions();
    }, [progress.level?.programId, progress.level?.id]);

    useEffect(() => {
        if (selectedDay) {
            const day = groupedSessions.get(selectedDay);
            setSessions(day || []);
        }
    }, [groupedSessions, selectedDay]);

    function groupSessions(sessions: ProgramSession[]) {
        const sessionsByDay = new Map<number, ProgramSession[]>();

        for (const session of sessions) {
            if (!sessionsByDay.has(session.day)) {
                sessionsByDay.set(session.day, []);
            }
            sessionsByDay.get(session.day)!.push(session);
        }

        return sessionsByDay;
    }



    async function fetchSessions() {
        const { result, error } = await tryCatch(
            fetch(`/api/protected/${params.id}/programs/${progress.level?.programId}/levels/${progress.level?.id}/sessions`)
        );

        if (error || !result?.ok) return;
        const data = await result.json();
        const sessionGroups = groupSessions(data);
        setGroupedSessions(sessionGroups);
    }


    function handleSessionSelection(sessionId: number) {
        setSelectedSessions(prev => {
            /* If session is already selected, remove it */
            if (prev.includes(sessionId)) {
                return prev.filter(id => id !== sessionId);
            }

            /* Check if we can add more sessions based on plan limit */
            const limit = progress.plan?.classLimitThreshold;
            const canAddMore = limit === null || prev.length < (limit || 0);

            /* Add session if possible, otherwise return unchanged */
            return canAddMore ? [...prev, sessionId] : prev;
        });
    }

    async function onSubmit() {
        if (selectedSessions.length === 0) {
            toast.error("Please select at least one session")
            return;
        }
        setLoading(true)
        const { result, error } = await tryCatch(
            fetch(`/api/protected/${params.id}/reservations`, {
                method: "POST",
                body: JSON.stringify({
                    sessionIds: selectedSessions,
                    packageId: progress.packageId,
                    subscriptionId: progress.subscriptionId
                })
            })
        )
        setLoading(false)
        if (error || !result || !result?.ok) return;

        toast.success("Subscription created successfully")
    }

    const getTotalSessionsText = useMemo(() => {
        if (!progress.plan?.classLimitThreshold) {
            return "Unlimited";
        }
        return `${selectedSessions.length}/${progress.plan.classLimitThreshold}`;
    }, [selectedSessions.length, progress.plan?.classLimitThreshold]);

    const isFull = useCallback((session: ProgramSession) => {
        return session.reservationsCount && session.reservationsCount >= (progress.level?.capacity || 10);
    }, [progress.level?.capacity]);

    return (
        <>
            <DialogBody >
                <div className="space-y-4 w-full">

                    <div className="space-y-1 flex flex-col gap-1">
                        <p className="text-[0.65rem] uppercase font-medium">Select Sessions ({getTotalSessionsText})</p>
                        <div className="flex flex-row gap-2">
                            {DAYS.map((day, i) => (
                                <div key={i} className={cn("text-sm hover:bg-indigo-500 cursor-pointer font-medium ",
                                    "rounded-full bg-foreground/5 h-8 w-8 flex items-center justify-center",
                                    selectedDay === day.value && "bg-indigo-500 text-white")}
                                    onClick={() => setSelectedDay(day.value)}>
                                    {day.label}
                                </div>
                            ))}
                        </div>
                        <div className="py-2">
                            {sessions.length > 0 ? (
                                <div className="grid grid-cols-3 gap-2">
                                    {sessions.map(session => (
                                        <div
                                            key={session.id}
                                            className={cn(
                                                "text-sm space-y-0.5 cursor-pointer hover:bg-indigo-500/40 py-2 px-3 rounded-sm bg-background border border-foreground/10",
                                                selectedSessions.includes(session.id as number) && "bg-indigo-500/40 border-indigo-500",
                                                "group data-[full=true]:opacity-50  data-[full=true]:cursor-not-allowed data-[full=true]:hover:bg-background"
                                            )}
                                            data-full={isFull(session)}
                                            onClick={() => {
                                                if (!isFull(session)) {
                                                    handleSessionSelection(session.id as number)
                                                }
                                            }}
                                        >
                                            <div className="text-base font-bold">{formatTime(session.time)}</div>
                                            <div className="flex flex-row gap-1 items-center text-[0.65rem]" >
                                                <span className="flex group flex-row gap-1.5 items-center group-data-[full=true]:text-red-500 text-green-500" >
                                                    <PulsingStatus live={!isFull(session)} />
                                                    <span >
                                                        <span className="group-data-[full=false]:block hidden">
                                                            {session.reservationsCount || 0}/{progress.level?.capacity}
                                                        </span>
                                                        <span className="group-data-[full=true]:block hidden uppercase">
                                                            Full
                                                        </span>
                                                    </span>
                                                </span>
                                                <span>/</span>
                                                <span className=" text-foreground/50 flex flex-row gap-1 items-center">
                                                    <Clock size={11} /> <span>{session.duration} mins</span>
                                                </span>
                                            </div>

                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-center text-foreground/50">
                                    No sessions found for this day
                                </div>
                            )}
                        </div>
                    </div>
                    {/* <div className="flex bg-background flex-row items-center gap-4 rounded-sm border border-foreground/10 p-3 ">
                        <Switch
                            checked={repeat}
                            onCheckedChange={setRepeat}
                        />

                        <div className="space-y-0">
                            <div className="text-sm">
                                Auto Repeat Session
                            </div>
                            <div className="text-xs text-foreground/50">
                                Automatically add this session to the member's schedule
                            </div>
                        </div>
                    </div> */}
                </div>
            </DialogBody>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline" size={"sm"}>Skip</Button>
                </DialogClose>
                {/* <DialogClose asChild> */}
                <Button
                    className={cn("children:hidden", loading && "children:block")}
                    variant={"foreground"}
                    size={"sm"}
                    type="submit"
                    disabled={loading || !progress.plan || !progress.level || selectedSessions.length === 0}
                    onClick={onSubmit}
                >
                    <Loader2 className="mr-2 h-4 w-4  animate-spin" />
                    Save
                </Button>
                {/* </DialogClose> */}
            </DialogFooter>
        </>
    );
}