
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui";
import { Achievement } from "@/types";
import { ColumnDef } from "@tanstack/react-table";

export const AchievementColumns = (locationId: string): ColumnDef<Achievement, any>[] => [

    {
        accessorKey: "title",
        header: "Title",
        id: "title",
        cell: ({ row }) => {
            const achievement = row.original
            return (

                <div className="flex flex-row items-center gap-2">

                    <Avatar className="group-hover:bg-violet-600 max-w-full flex items-center justify-center text-black-100 w-5 h-5 mr-2 bg-gray-200 rounded-full">
                        <AvatarImage
                            src={achievement.icon ? achievement.icon : ''}
                        />
                        <AvatarFallback className=" bg-gray-200 text-gray-400 text-xs ">
                            {achievement.title.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                        {achievement.title}
                    </span>
                </div>
            )
        },
    },
    {
        accessorKey: "badge",
        header: "Badge",
    },
    {
        accessorKey: "description",
        header: "Description",
    },
    {
        accessorKey: "points",
        header: "Points",

    },
    {
        accessorKey: "members",
        header: "Member Count",
        cell: ({ row }) => {
            const achievement = row.original;
            return <span>{achievement.members ? achievement.members.length : 0}</span>;
        },
    },
    {
        accessorKey: "actions",
        header: "Action Name",
        cell: ({ row }) => {
            const achievement = row.original;
            if (!achievement.actions || achievement.actions.length === 0) {
                return <span>No actions</span>;
            }

            return (
                <div className="flex flex-col gap-1">
                    {achievement.actions.map((action) => (
                        <span key={action.id} className="text-sm">
                            {action.name} (x{action.count})
                        </span>
                    ))}
                </div>
            );
        },
    },
    // {
    //   accessorKey: "status",
    //   header: "Status",
    // },
];
