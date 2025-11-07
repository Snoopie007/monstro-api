"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui";
import { Achievement } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { UpdateAchievement } from ".";
import { AchievementTriggers } from "@/libs/data";
interface AchievementColumnsProps {
	canEditAchievement: boolean;
}
export const AchievementColumns = ({ canEditAchievement }: AchievementColumnsProps): ColumnDef<Achievement, any>[] => {

	return [
		{
			accessorKey: "name",
			header: "Name",
			id: "name",
			cell: ({ row }) => {
				const achievement = row.original;
				return (
					<div className="flex flex-row items-center justify-between w-[240px]">
						<div className="flex flex-row items-center gap-2">
							<Avatar className="size-8 bg-foreground/5">
								<AvatarImage src={achievement.badge} />
								<AvatarFallback className=" bg-foreground/5 text-foreground/50 text-xs size-6 ">
									{achievement.name.charAt(0)}
								</AvatarFallback>
							</Avatar>
							<span className="text-sm font-bold truncate max-w-[150px]">
								{achievement.name}
							</span>
						</div>
						<div className="flex flex-row items-center gap-1">
							{canEditAchievement && <UpdateAchievement achievement={achievement} />}

						</div>
					</div>
				);
			},
		},
		{
			accessorKey: "triggers",
			header: "Trigger",
			cell: ({ row }) => {
				const achievement = row.original;
				const trigger = AchievementTriggers.find(trigger => trigger.id === achievement.triggerId);
				return <span className="text-sm">{trigger?.name}</span>
			}
		},
		{
			accessorKey: "description",
			header: "Description",
			cell: ({ row }) => {
				const achievement = row.original;
				return (
					<span className="text-sm truncate max-w-[100px]">
						{achievement.description.slice(0, 20)}...
					</span>
				);
			},
		},
		{
			accessorKey: "requiredActionCount",
			header: "Required Count",
		},
		{
			accessorKey: "points",
			header: "Awarded Points",
			cell: ({ row }) => {
				const achievement = row.original;
				return <span>{achievement.points}</span>;
			},
		},

	];
};
