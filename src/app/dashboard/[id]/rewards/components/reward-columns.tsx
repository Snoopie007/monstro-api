import { Checkbox } from "@/components/forms/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui";
import { Reward } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export const RewardColumns = (locationId: string): ColumnDef<Reward, any>[] => [

    {
        accessorKey: "name",
        header: "Name",
        id: "name",
        cell: ({ row }) => {
            const reward = row.original
            return (

                <div className="flex flex-row items-center gap-2">

                    <Avatar className="group-hover:bg-violet-600 max-w-full flex items-center justify-center text-black-100 w-5 h-5 mr-2 bg-gray-200 rounded-full">
                        <AvatarImage
                            src={reward.images[0]}
                        />
                        <AvatarFallback className=" bg-gray-200 text-gray-400 text-xs ">
                            {reward.name.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                        {reward.name}
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
