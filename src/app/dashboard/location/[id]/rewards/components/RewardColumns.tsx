
import { Reward } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil } from "lucide-react";

export const RewardColumns = (locationId: string, onEdit: (reward: Reward) => void): ColumnDef<Reward, any>[] => [
    {
        accessorKey: "name",
        header: "Name",
        id: "name",
        cell: ({ row }) => {
            const reward = row.original
            return (

                <div className="flex flex-row items-center gap-2 group">
                    <span className="text-sm">
                        {reward.name}
                    </span>
                    <span>
                        <Pencil size={12} className="cursor-pointer opacity-30 group-hover:opacity-100" onClick={() => onEdit(reward)} />
                    </span>
                </div>
            )
        },
    },
    {
        accessorKey: "requiredPoints",
        header: "Required Points",
    },
    {
        accessorKey: "limitPerMember",
        header: " Limit Per Member",

    },
    {
        accessorKey: "totalClaimed",
        header: "Total Claimed",
    },
    // {
    //   accessorKey: "status",
    //   header: "Status",
    // },
];
