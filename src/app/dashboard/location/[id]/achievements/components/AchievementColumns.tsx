
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui";
import { Achievement } from "@/types";
import { ColumnDef } from "@tanstack/react-table";

export const AchievementColumns = (): ColumnDef<Achievement, any>[] => [
    {
        accessorKey: "name",
        header: "Name",
        id: "name",
        cell: ({ row }) => {
            const achievement = row.original
            return (

                <div className="flex flex-row items-center gap-1">

                    <Avatar className="max-w-full flex items-center justify-center text-black-100 size-6 bg-foreground/5 rounded-full">
                        <AvatarImage
                            src={achievement.badge ? achievement.badge : ''}
                        />
                        <AvatarFallback className=" bg-foreground/5 text-foreground/50 text-xs size-6 ">
                            {achievement.name.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                        {achievement.name}
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

    }

];
