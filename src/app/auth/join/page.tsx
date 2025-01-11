import PlanBuilder from '@/app/clubs/[id]/register/plan/components/plan-builder';
import React from 'react'



async function getData(type: string): Promise<{ plans: Plan[], launchers: Launcher[] }> {
    try {
        const results = await db.transaction(async (tx) => {
            const plans = await tx.query.plans.findMany({
                where: (plans, { eq }) => eq(plans.cycle, type),
                orderBy: (plans, { asc }) => asc(plans.price)
            });
            const launchers = await tx.query.launchers.findMany();
            return { plans, launchers };
        });
        return results;
    } catch (error) {
        console.error(error);
        return { plans: [], launchers: [] };
    }
}
function JoinPage() {
    const { plans, launchers } = await getData("annual");
    if (!plans || plans.length === 0) {
        return (
            <div className="flex sm:flex-row flex-col sm:gap-2 gap-0  ">
                No Plans Found
            </div>
        );
    }
    return (
        <div className="max-w-3xl w-full m-auto">
            <PlanBuilder plans={plans} launchers={launchers} />
        </div>
    );
}

export default JoinPage