export interface Reward {
	id?: number,
	name: string,
	description: string,
	images: string[],
	limitPerMember: number,
	totalLimit: number,
	requiredPoints: number
	created?: Date,
	updated?: Date | null
}