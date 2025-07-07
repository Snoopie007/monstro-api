
import { Badge } from "@/components/ui/badge";
import { cn, formatAmountForDisplay } from "@/libs/utils";
import { MemberPlan, PlanProgram } from "@/types";
import { ColumnDef } from "@tanstack/react-table";

import { UpdatePkg } from "./Update/UpdatePkg";

export const PkgColumns = (locationId: string): ColumnDef<MemberPlan, any>[] => [
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
            const pkg = row.original
            return (
                <div className="flex items-center gap-1 justify-between w-[150px]">
                    <span className="truncate">{pkg.name}</span>
                    <UpdatePkg lid={locationId} pkg={pkg} />
                </div>
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
                <div className="flex flex-wrap gap-1">
                    {programCount > 0 ? (
                        <>
                            {planPrograms?.slice(0, 3).map((planProgram: PlanProgram) => (
                                <Badge key={planProgram.program?.id} size={"tiny"} variant={"default"} className="rounded-sm">
                                    {planProgram.program?.name}
                                </Badge>
                            ))}
                            {programCount > 3 && (
                                <span>   +{programCount - 3}</span>
                            )}
                        </>
                    ) : (
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
    },
    {
        accessorKey: "totalClassLimit",
        header: "Total Classes",
        cell: ({ row }) => {
            const plan = row.original
            return (
                <span className="text-sm">
                    {plan.totalClassLimit}
                </span>
            )
        }
    }
];
