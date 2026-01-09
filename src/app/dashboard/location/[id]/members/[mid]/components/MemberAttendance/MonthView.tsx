"use client";

import { useState, useMemo } from 'react'
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
    Separator,
    Button,
    Badge,
} from '@/components/ui'
import { cn } from '@/libs/utils'
import { formatDate, isPast, format } from 'date-fns'
import { Attendance } from '@/types'
import { AlertTriangle, CalendarPlus, CalendarX, Wrench } from 'lucide-react'
import { ScheduleMakeupDialog } from './ScheduleMakeupDialog'

interface MissedReservation {
    id: string;
    programName?: string;
    startOn: Date | string;
    programId?: string;
}

interface Closure {
    type: 'holiday' | 'maintenance';
    reason: string;
}

interface DayData {
    isEmpty: boolean;
    date: Date;
    count: number;
    attendances: Attendance[];
    missedReservations?: MissedReservation[];
    closure?: Closure;
}

interface ClosureData {
    date: string;
    type: 'holiday' | 'maintenance';
    reason: string;
}

interface MonthViewProps {
    weeks: DayData[][];
    month: string;
    locationId?: string;
    memberId?: string;
    onMakeupScheduled?: () => void;
    closures?: ClosureData[];
}

export const MonthView = ({ weeks, month, locationId, memberId, onMakeupScheduled, closures = [] }: MonthViewProps) => {
    const [makeupDialogOpen, setMakeupDialogOpen] = useState(false);
    const [selectedMissedReservation, setSelectedMissedReservation] = useState<MissedReservation | null>(null);

    const closuresByDate = useMemo(() => {
        const map = new Map<string, ClosureData>();
        for (const closure of closures) {
            map.set(closure.date.slice(0, 10), closure);
        }
        return map;
    }, [closures]);

    function handleScheduleMakeup(reservation: MissedReservation) {
        setSelectedMissedReservation(reservation);
        setMakeupDialogOpen(true);
    }

    function handleMakeupSuccess() {
        setMakeupDialogOpen(false);
        setSelectedMissedReservation(null);
        onMakeupScheduled?.();
    }

    return (
        <div className="flex-1">
            <div className="flex flex-col gap-1 w-full">
                <span className='text-sm font-medium w-full text-left uppercase text-muted-foreground/80'>{month}</span>
                {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-row gap-1 w-full">
                        {week.map((day: DayData, dayIndex: number) => {
                            const dateKey = format(day.date, 'yyyy-MM-dd');
                            const closure = day.closure || closuresByDate.get(dateKey);
                            const isClosure = !!closure;
                            const hasMissedClasses = !isClosure && day.missedReservations && day.missedReservations.length > 0;
                            const isInPast = isPast(new Date(day.date));
                            
                            return (
                                <div key={dayIndex} className="flex-1 aspect-square" >
                                    {day.isEmpty ? (
                                        <div className={cn(
                                            'size-full rounded-sm dark:border-slate-800 transition-colors duration-200 ',
                                            'dark:bg-slate-900/20 bg-transparent'
                                        )} />
                                    ) : (
                                        <HoverCard>
                                            <HoverCardTrigger asChild>
                                                <div
                                                    className={cn(
                                                        'size-full rounded-sm dark:border-slate-800 cursor-pointer',
                                                        'transition-colors duration-200 border border-gray-200',
                                                        'hover:border-gray-400 relative',
                                                        isClosure && 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700',
                                                        !isClosure && day.count === 0 && !hasMissedClasses &&
                                                        'dark:bg-[#0f172a] bg-[#ebedf0]',
                                                        !isClosure && day.count > 0 &&
                                                        'bg-indigo-700 dark:bg-indigo-500',
                                                        !isClosure && hasMissedClasses && day.count === 0 &&
                                                        'bg-amber-500/30 dark:bg-amber-500/20 border-amber-500/50'
                                                    )}
                                                >
                                                    {isClosure && (
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            {closure?.type === 'holiday' ? (
                                                                <CalendarX className="size-2.5 text-gray-500 dark:text-gray-400" />
                                                            ) : (
                                                                <Wrench className="size-2.5 text-gray-500 dark:text-gray-400" />
                                                            )}
                                                        </div>
                                                    )}
                                                    {!isClosure && hasMissedClasses && (
                                                        <div className="absolute -top-1 -right-1 size-2 bg-amber-500 rounded-full" />
                                                    )}
                                                </div>
                                            </HoverCardTrigger>
                                            <HoverCardContent className="w-64">
                                                <div className="text-sm text-muted-foreground">
                                                    {formatDate(day.date, 'PPP')}
                                                </div>

                                                {isClosure && (
                                                    <>
                                                        <Separator className="mt-1 mb-2 bg-foreground/10" />
                                                        <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md p-2">
                                                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 mb-1">
                                                                {closure?.type === 'holiday' ? (
                                                                    <CalendarX className="size-3" />
                                                                ) : (
                                                                    <Wrench className="size-3" />
                                                                )}
                                                                <span className="text-xs font-medium capitalize">{closure?.type}</span>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">{closure?.reason}</p>
                                                        </div>
                                                    </>
                                                )}
                                                
                                                {!isClosure && day.attendances.length > 0 && (
                                                    <>
                                                        <Separator className="mt-1 mb-2 bg-foreground/10" />
                                                        {day.attendances.map((attendance: Attendance, index: number) => (
                                                            <div key={index} className="flex flex-col gap-1 text-xs mb-2">
                                                                <div className="flex flex-row gap-1 items-center justify-between">
                                                                    <span className="text-muted-foreground">program:</span>
                                                                    <span className="text-foreground font-medium">
                                                                        {attendance.programName || 'Unknown'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-row gap-1 items-center justify-between">
                                                                    <span className="text-muted-foreground">started at:</span>
                                                                    <span className="text-foreground font-medium">
                                                                        {formatDate(attendance.startTime, 'hh:mm a')}
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-row gap-1 items-center justify-between">
                                                                    <span className="text-muted-foreground">checked in:</span>
                                                                    <span className="text-foreground font-medium">
                                                                        {formatDate(attendance.checkInTime, 'hh:mm a')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </>
                                                )}
                                                
                                                {!isClosure && hasMissedClasses && isInPast && (
                                                    <>
                                                        <Separator className="mt-1 mb-2 bg-foreground/10" />
                                                        <div className="space-y-2">
                                                            {day.missedReservations?.map((missed, index) => (
                                                                <div key={index} className="bg-amber-500/10 border border-amber-500/20 rounded-md p-2">
                                                                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 mb-1">
                                                                        <AlertTriangle className="size-3" />
                                                                        <span className="text-xs font-medium">Missed</span>
                                                                    </div>
                                                                    <div className="text-xs space-y-0.5">
                                                                        <div className="flex justify-between">
                                                                            <span className="text-muted-foreground">program:</span>
                                                                            <span className="font-medium">{missed.programName || 'Unknown'}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-muted-foreground">time:</span>
                                                                            <span className="font-medium">
                                                                                {formatDate(new Date(missed.startOn), 'hh:mm a')}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    {locationId && memberId && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="w-full mt-2 h-7 text-xs"
                                                                            onClick={() => handleScheduleMakeup(missed)}
                                                                        >
                                                                            <CalendarPlus className="size-3 mr-1" />
                                                                            Schedule Make-up
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </HoverCardContent>
                                        </HoverCard>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Make-up Dialog */}
            {selectedMissedReservation && locationId && memberId && (
                <ScheduleMakeupDialog
                    locationId={locationId}
                    memberId={memberId}
                    originalReservation={selectedMissedReservation}
                    open={makeupDialogOpen}
                    onOpenChange={setMakeupDialogOpen}
                    onSuccess={handleMakeupSuccess}
                />
            )}
        </div>
    )
}
