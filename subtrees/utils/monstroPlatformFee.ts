export const FREE_MONSTRO_PLAN_ID = 1;

export function getMonstroPlatformFeePercent(planId: number) {
	return planId === FREE_MONSTRO_PLAN_ID ? 2 : 0;
}
