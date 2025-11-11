
import { Reward } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { UpdateReward } from "./UpdateReward";

export const RewardColumns = (lid: string): ColumnDef<Reward, any>[] => [
    {
        accessorKey: "name",
        header: "Name",
        id: "name",
        cell: ({ row }) => {
            const reward = row.original
            return (

                <div className="flex flex-row items-center gap-2 group justify-between w-[150px]">
                    <span className=" font-medium truncate">
                        {reward.name}
                    </span>
                    <UpdateReward reward={reward} lid={lid} />
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
    }
]