
import { Badge } from "@/components/ui/badge";
import { cn, formatAmountForDisplay } from "@/libs/utils";
import { MemberPlan, PlanProgram } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export const PkgColumns = (locationId: string): ColumnDef<MemberPlan, any>[] => [
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
            const program = row.original
            return (
                <Link href={`/dashboard/location/${locationId}/programs/${program.id}`} className="" >
                    {program.name}
                </Link>
            )
        },
    },
    {
        accessorKey: "Programs",
        header: "Programs",
        cell: ({ row }) => {
            const planPrograms = row.original.planPrograms
            const programCount = planPrograms?.length || 0
            return (
                <div className="flex flex-wrap">

                    {programCount > 0 ? planPrograms?.map((planProgram: PlanProgram) => (
                        <div key={planProgram.program.id} className="text-xs ">
                            {planProgram.program.name.slice(0, 1)}
                        </div>
                    )) : (
                        <div className="text-sm">
                            No programs
                        </div>
                    )}
                </div>
            )
        },
    },
    {
        accessorKey: "family",
        header: "Family",
        cell: ({ row }) => {
            const plan = row.original
            return <Badge variant={plan.family ? "active" : "inactive"} size="tiny">{plan.family ? "Yes" : "No"}</Badge>
        }
    },
    {
        accessorKey: "familyMemberLimit",
        header: "Family Limit"
    },
    {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => {
            const plan = row.original
            return (
                <span className="text-sm">
                    {formatAmountForDisplay(plan.price / 100, plan.currency)}
                </span>
            )
        }
    }
];
