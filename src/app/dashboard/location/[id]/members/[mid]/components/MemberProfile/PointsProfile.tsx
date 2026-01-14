"use client";
import { useMemo } from "react";
import { useMemberStatus } from "../../providers/MemberContext";

export function PointsProfile() {
	const { ml } = useMemberStatus();

	const spentPoints = useMemo(() => {
		return (ml.totalPointsEarned || 0) - (ml.points || 0);
	}, [ml?.points, ml.totalPointsEarned]);
	return (
		<div className="grid grid-cols-3 gap-2">
			<div className="bg-muted/50 rounded-lg p-3 flex flex-col gap-1">
				<div className="text-xs  text-muted-foreground">
					Total Points Earned
				</div>
				<div className="text-xl font-bold">
					<span>{ml.totalPointsEarned || 0}</span>
				</div>
			</div>
			<div className="bg-muted/50 rounded-lg p-3 flex flex-col gap-1">
				<div className="text-xs  text-muted-foreground">Current Balance</div>
				<div className="text-xl font-bold">
					<span>{ml.points}</span>
				</div>
			</div>
			<div className="bg-muted/50 rounded-lg p-3 flex flex-col gap-1">
				<div className="text-xs  text-muted-foreground">Points Spent</div>
				<div className="text-xl font-bold">
					<span>{spentPoints}</span>
				</div>
			</div>
		</div>
	);
}
