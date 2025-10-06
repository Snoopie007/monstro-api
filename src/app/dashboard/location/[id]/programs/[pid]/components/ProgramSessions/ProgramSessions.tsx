import { ProgramSession } from "@/types"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useCallback } from "react";
import SessionActions from "./actions";
import { addMinutes, format } from "date-fns";
import { CreateSession } from "./CreateSession";
import { DaysOfWeek } from "../../../schemas";

interface ProgramSessionsProps {
    sessions: ProgramSession[];
    pid: string;
    lid: string;
    editable: boolean
}

export function ProgramSessions({ sessions, pid, lid, editable }: ProgramSessionsProps) {

    const calculateTime = useCallback((time: string, duration: number) => {

        const [hours, minutes] = time.split(':').map(Number)
        const startTime = new Date()
        startTime.setHours(hours, minutes, 0)

        const endTime = addMinutes(startTime, duration)
        return `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`
    }, [])
    return (
        <>

            <Card className="border-x-0 border-y border-foreground/10">
                <CardHeader className="flex flex-row items-center justify-between p-4">
                    <div className="flex-1 text-sm  font-semibold  ">
                        Sessions
                    </div>
                    <div className="flex-initial fl ex flex-row items-center h-full">
                        {editable && <CreateSession pid={pid} lid={lid} />}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {sessions.length > 0 ?
                        <Table className=" w-full">
                            <TableHeader className="bg-foreground/5 ">
                                <TableRow >
                                    {["Day", "Time", "Duration", ""].map((title, index) => (
                                        <TableHead key={index} className="h-auto  py-2 font-medium  text-xs" >
                                            {title}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessions && sessions.map((session: ProgramSession, i: number) => {
                                    return (
                                        <TableRow key={i} className="border-t  group cursor-pointer  ">
                                            <TableCell className={"text-xs"}>
                                                {DaysOfWeek[session.day! - 1]}
                                            </TableCell>
                                            <TableCell className={"text-xs"}>
                                                {calculateTime(session.time, session.duration!)}
                                            </TableCell>
                                            <TableCell className={"text-xs"}>
                                                {session.duration}
                                            </TableCell>

                                            <TableCell className={"text-xs"}>
                                                <SessionActions session={session} lid={lid} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>

                        </Table>
                        :
                        <div className="text-sm py-6 font-roboto font-semibold  text-center">
                            No Sessions Found
                        </div>
                    }

                </CardContent>
            </Card>
        </>

    )
}
