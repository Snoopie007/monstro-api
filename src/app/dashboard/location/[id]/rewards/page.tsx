import ErrorComponent from '@/components/error';
import { db } from "@/db/db";
import { RewardList, CreateReward } from "./components";
import { RewardProvider } from "./providers";

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
			<div className='max-w-4xl mx-auto py-4 space-y-4'>

				<CreateReward lid={lid} />
				<div className='border border-foreground/10 rounded-lg'>
					<RewardList lid={lid} />
				</div>
			</div>
		</RewardProvider>
	)
}
