import { Level } from "@/types"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Button,
} from "@/components/ui";

import { cn } from "@/libs/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { UpsertLevel } from "./upsert-level";

import { useMemo, useState } from "react";
import LevelActions from "./actions";
import { del } from "@/libs/api";
import useSWR from "swr";
const CellStyle = "text-sm px-4 py-2 font-roboto";

export function ProgramLevels({ levels, programId, locationId }: { levels: Level[], programId: number, locationId: string }) {
    const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
    const { mutate } = useSWR(`/api/protected/${locationId}/programs/${programId}`);

    const editLevelOptions = useMemo(() => {
        return {
            currentLevel,
            onChange(level: Level | null) {
                console.log("level", level);
                setCurrentLevel(level);
            },
            async onDelete(id: number) {
                await del({url: `programs/${programId}/levels/${id}`, id: locationId}).then(() => {
                    mutate();
                });
            }
        };
    }, [currentLevel]);

    function create() {
        setCurrentLevel({
            name: "",
            capacity: 0,
            minAge: 0,
            maxAge: 0,
            programId,
            sessions: [
                {
                    monday: "12:00:00",
                    durationTime: 60,
                    status: true
                }
            ]
        });
    }
    return (
        <>
            <UpsertLevel level={editLevelOptions.currentLevel} onChange={editLevelOptions.onChange} programId={programId} locationId={locationId} />
            <Card className="rounded-sm">
                <CardHeader className="p-0">
                    <div className="flex flex-row items-center justify-between border-b ">
                        <div className="flex-1 inline-block text-sm  px-4 font-semibold capitalize ">
                            Levels
                        </div>
                        <div className="flex-initial flex flex-row items-center h-full">

                            {/* <Toggle className="flex flex-row hover:text-foreground font-semibold bg-transparent h-full py-3 rounded-none border-l items-center gap-1 px-4 ">
                                Archived
                            </Toggle> */}
                            <Button onClick={create} variant={"ghost"} className={" h-full border-l  rounded-none"}>
                                Add Level
                            </Button>

                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {levels.length > 0 ?
                        <Table className=" w-full">
                            <TableHeader className="bg-foreground/5 ">
                                <TableRow >
                                    {["Name", "Capacity", "Age Range", ""].map((title, index) => (
                                        <TableHead key={index} className="h-auto  py-2 font-medium  text-sm" >
                                            {title}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {levels?.map((level: Level, i: number) => {
                                    return (
                                        <TableRow key={i} className="border-t group cursor-pointer  ">
                                            <TableCell className={CellStyle}>
                                                {level.name}
                                            </TableCell>
                                            <TableCell className={CellStyle}>
                                                {level?.capacity}
                                            </TableCell>
                                            <TableCell className={CellStyle}>
                                                {level?.minAge} - {level?.maxAge}
                                            </TableCell>

                                            <TableCell className={cn(CellStyle)}>
                                                <LevelActions level={level} onChange={editLevelOptions.onChange} onDelete={editLevelOptions.onDelete} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>

                        </Table>
                        :
                        <div className="text-sm py-6 font-roboto font-semibold  text-center">
                            No Levels Found
                        </div>
                    }

                </CardContent>
            </Card>
        </>

    )
}
