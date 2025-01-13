import { Achievement } from "./achievement"

export interface Reward {
	id?: number,
	name: string,
	description: string,
	images: Array<string>,
	// icon: string,
	limitPerMember: number,
	limitTotal: string,
	requiredPoints: number
}