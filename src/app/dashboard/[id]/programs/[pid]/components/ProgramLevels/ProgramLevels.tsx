import { ProgramLevel } from "@/types"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useMemo, useState } from "react";
import LevelActions from "./actions";
import { CreateLevel } from "./CreateLevel";
import useSWR from "swr";

interface ProgramLevelsProps {
    levels: ProgramLevel[];
    pid: number;
    lid: string;
}

export function ProgramLevels({ levels, pid, lid }: ProgramLevelsProps) {
    const [currentLevel, setCurrentLevel] = useState<ProgramLevel | null>(null);
    const { mutate } = useSWR(`/api/protected/${lid}/programs/${pid}`);

    const editLevelOptions = useMemo(() => {
        return {
            currentLevel,


        };
    }, [currentLevel]);

    return (
        <>

            <Card className="rounded-sm">
                <CardHeader className="p-0">
                    <div className="flex flex-row items-center justify-between border-b ">
                        <div className="flex-1 inline-block text-sm  px-4 font-semibold capitalize ">
                            Levels
                        </div>
                        <div className="flex-initial fl ex flex-row items-center h-full">

                            <CreateLevel pid={pid} lid={lid} />

                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {levels.length > 0 ?
                        <Table className=" w-full">
                            <TableHeader className="bg-foreground/5 ">
                                <TableRow >
                                    {["Name", "Capacity", "Age Range", ""].map((title, index) => (
                                        <TableHead key={index} className="h-auto  py-2 font-medium  text-xs" >
                                            {title}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {levels?.map((level: ProgramLevel, i: number) => {
                                    return (
                                        <TableRow key={i} className="border-t  group cursor-pointer  ">
                                            <TableCell className={"text-xs"}>
                                                {level.name}
                                            </TableCell>
                                            <TableCell className={"text-xs"}>
                                                {level?.capacity}
                                            </TableCell>
                                            <TableCell className={"text-xs"}>
                                                {level?.minAge} - {level?.maxAge}
                                            </TableCell>

                                            <TableCell className={"text-xs"}>
                                                <LevelActions level={level} lid={lid} />
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
