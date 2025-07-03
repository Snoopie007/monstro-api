'use client'
import { Avatar, AvatarFallback, AvatarImage, Button } from "@/components/ui";
import { Achievement } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { UpdateAchievement, UpdateTrigger } from ".";
import { useAchievements } from "../providers";
import { CircleFadingArrowUp } from "lucide-react";


export const AchievementColumns = (): ColumnDef<Achievement, any>[] => {
    const { setCurrentAchievement } = useAchievements();
    return [
        {
            accessorKey: "name",
            header: "Name",
            id: "name",
            cell: ({ row }) => {
                const achievement = row.original
                return (
                    <div className="flex flex-row items-center justify-between w-[300px]">

                        <div className="flex flex-row items-center gap-2">

                            <Avatar className="max-w-full flex items-center justify-center text-black-100 size-6 bg-foreground/5 rounded-full">
                                <AvatarImage
                                    src={achievement.badge ? achievement.badge : ''}
                                />
                                <AvatarFallback className=" bg-foreground/5 text-foreground/50 text-xs size-6 ">
                                    {achievement.name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-bold truncate max-w-[150px]">
                                {achievement.name}
                            </span>
                        </div>
                        <div className="flex flex-row items-center gap-1">
                            <UpdateAchievement achievement={achievement} />
                            {achievement.triggedAchievement ? (
                                <UpdateTrigger achievement={achievement} ta={achievement.triggedAchievement} />
                            ) : (
                                <Button variant={"ghost"} size={"icon"} className='size-5'
                                    onClick={() => setCurrentAchievement(achievement)}>
                                    <CircleFadingArrowUp className='size-3' />
                                </Button>
                            )}
                        </div>
                    </div>
                )
            },
        },
        {
            accessorKey: "description",
            header: "Description",
            cell: ({ row }) => {
                const achievement = row.original
                return (
                    <span className="text-sm truncate max-w-[100px]">{achievement.description.slice(0, 20)}...</span>
                )
            }
        },
        {
            accessorKey: "requiredCount",
            header: "required Count",

        },
        {
            accessorKey: "awardedPoints",
            header: "Awarded Points",
            cell: ({ row }) => {
                const achievement = row.original
                return (
                    <span className="text-sm">{achievement.awardedPoints}</span>
                )
            }
        },
        {
            accessorKey: "triggers",
            header: "Trigger",
            cell: ({ row }) => {
                const achievement = row.original
                const trigger = achievement.triggedAchievement?.trigger
                return <span className="text-sm">{trigger?.name || 'None'}</span>
            }
        }
    ];
}
