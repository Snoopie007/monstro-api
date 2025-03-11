
import {
    ColumnFiltersState,
    getCoreRowModel,
    getFilteredRowModel,
    Table,
    useReactTable,
} from "@tanstack/react-table"
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/forms/input";

import { ProgramMemberColumns } from "./ProgramMemberColumns";
import { ProgramMemberTable } from "./ProgramMemberTable";

import { Member } from "@/types";
import { useProgramMembers } from "@/hooks/usePrograms";


export function ProgramMembers({ programId, locationId }: { programId: number, locationId: string }) {
    const { members, error, isLoading } = useProgramMembers(locationId, programId)
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    // const [syncLoading, setSyncLoading] = useState<boolean>(false)
    const columns = ProgramMemberColumns(locationId)
    // const data = React.useMemo(() => {
    //     const rows: any = [];
    //     let count = 0;
    //     if (members && members.length) {
    //         members.forEach((level: any) => {
    //             count += level.reservations.length;
    //             level.reservations.forEach((reservation: any) => {
    //                  rows.push({
    //                     id: reservation.member.id,
    //                     name: reservation.member.name,
    //                     email: reservation.member.email,
    //                     phone: reservation.member.phone,
    //                     referralCode: reservation.member.referralCode,
    //                     status: reservation.member.activityStatus,
    //                     levelName: level.programLevelName,
    //                 });
    //             });
    //         });
    //         // setReservationCount(count);
    //     }

    //     return rows;
    // }, [members]);



    const table: Table<Member> = useReactTable({
        data: members,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            columnFilters,
        },
    })


    return (
        <>
            <div className="flex flex-row items-center justify-between mb-2">
                <div className="flex-initial">
                    <Input
                        placeholder="Filter names..."
                        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn("name")?.setFilterValue(event.target.value)
                        }
                        className="border text-sm h-auto py-2 rounded-sm"
                    />
                </div>

                {/* <Button variant={"foreground"} className=' rounded-sm '>
                    Enroll Member
                </Button> */}
            </div>

            <div className="flex flex-col w-full">
                <ProgramMemberTable table={table} columns={columns.length} isLoading={isLoading} />
            </div >
        </>
    )
}
