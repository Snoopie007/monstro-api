import { db } from "@/db/db";
import { migrateMembers } from "subtrees/schemas";
import { eq } from "drizzle-orm";
import type { AuthAdditionalData } from "@subtrees/types/auth";

type HandleAdditionalDataOptions = {
	delay?: number;
};

export async function handleAdditionalData(
	additionalData: AuthAdditionalData,
	memberId: string,
	options: HandleAdditionalDataOptions = {},
): Promise<void> {
	const { delay = 1000 } = options;
	const today = new Date();

	const updateMigrateMember = async () => {
		try {
			if (additionalData.migrateId) {
				await db
					.update(migrateMembers)
					.set({
						memberId: memberId,
						viewedOn: today,
						updated: today,
					})
					.where(eq(migrateMembers.id, additionalData.migrateId));
			}
		} catch (error) {
			console.error(error);
		}
	};

	if (additionalData.migrateId) {
		setTimeout(() => {
			void updateMigrateMember();
		}, delay);
	}
}

