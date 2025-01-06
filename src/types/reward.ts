import { Achievement } from "./achievement"

export interface Reward {
	id?: number,
	name: string,
	description: string,
	images: Array<string>,
	icon: string,
	limitPerMember: number,
	achievementId: number,
	achievement: Achievement,
	requiredPoints: number
}