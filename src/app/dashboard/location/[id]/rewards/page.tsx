import ErrorComponent from '@/components/error';
import { db } from "@/db/db";
import { RewardList, CreateReward } from "./components";
import { RewardProvider } from "./providers";
import { ScrollArea } from "@/components/ui";

async function fetchRewards(lid: string) {
	try {
		const rewards = await db.query.rewards.findMany({
			where: (rewards, { eq }) => eq(rewards.locationId, lid),
		});

		return rewards;
	} catch (error) {
		console.error(error);
		return null;
	}
}

export default async function Rewards(props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
	const lid = params.id;
	const rewards = await fetchRewards(lid);

	if (!rewards) return <ErrorComponent error={new Error('Failed to fetch rewards')} />

	return (
		<RewardProvider rewards={rewards}>
			<ScrollArea className="h-[calc(100vh-52px)] w-full ">

				<div className='max-w-4xl mx-auto py-4 space-y-4'>

					<CreateReward lid={lid} />
					<div className='border border-foreground/10 rounded-lg mb-10'>
						<RewardList lid={lid} />
					</div>
				</div>
			</ScrollArea>
		</RewardProvider>
	)
}
