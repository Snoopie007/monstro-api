"use client";

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	Skeleton,
} from "@/components/ui";
import { Item, ItemContent, ItemMedia } from "@/components/ui/item";
import type { MemberReward } from "@/types";
import { format } from "date-fns";
import { GiftIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

interface MemberRewardsProps {
	params: { id: string; mid: string };
}

export function MemberRewards({ params }: MemberRewardsProps) {
	const [rewards, setRewards] = useState<Array<MemberReward>>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		if (rewards.length === 0) {
			fetchRewards();
		}
	}, [params.id]);

	async function fetchRewards() {
		try {
			setLoading(true);
			const res = await fetch(
				`/api/protected/loc/${params.id}/members/${params.mid}/rewards`,
			);
			if (res.ok) {
				const data = await res.json();
				setRewards(data);
			}
		} catch (error) {
			console.error("Failed to fetch rewards:", error);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="space-y-2">
			<div>
				{loading && (
					<div className="space-y-2">
						<Skeleton className="h-14 w-full" />
						<Skeleton className="h-14 w-full" />
						<Skeleton className="h-14 w-full" />
					</div>
				)}

				{!loading && rewards.length > 0 ? (
					<div className="space-y-2">
						{rewards.map((mr) => (
							<MemberRewardItem key={mr.id} mr={mr} />
						))}
					</div>
				) : (
					!loading &&
					rewards.length === 0 && (
						<Empty variant="border">
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<GiftIcon className="size-5" />
								</EmptyMedia>
								<EmptyTitle>No rewards found</EmptyTitle>
								<EmptyDescription>
									Rewards will appear here when they are claimed
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					)
				)}
			</div>
		</div>
	);
}

function MemberRewardItem({ mr }: { mr: MemberReward }) {
	const reward = mr.reward;
	const image = reward?.images ? reward.images[0] : "";

	return (
		<Item variant="muted">
			<ItemMedia variant="image" className="size-8">
				<Image
					src={image || ""}
					alt={reward?.name || ""}
					width={34}
					height={34}
				/>
			</ItemMedia>
			<ItemContent className="flex flex-row justify-between gap-2 items-center">
				<span className="font-medium">{reward?.name}</span>
				<span className="text-muted-foreground ">
					{format(mr.created, "MMM d, yyyy")}
				</span>
			</ItemContent>
			{/* <ItemActions>
                <Button variant="ghost" size="icon">
                    <EllipsisVerticalIcon className="size-4" />
                </Button>
            </ItemActions> */}
		</Item>
	);
}
