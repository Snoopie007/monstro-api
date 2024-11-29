export interface Reward {
	id?: number,
	name: string,
	description: string,
	image: string,
	type: number,
	limitPerMember: number,
	achievementId: number
	rewardPoints: number
}