
import React from 'react'
import { plans, launchers, MonstroPlan, MonstroLauncher } from './dummy-data';
import VendorPlanBuilder from './components/builder';


async function fetchData(): Promise<{ plans: MonstroPlan[], launchers: MonstroLauncher[] }> {
    try {
        // const results = await db.transaction(async (tx) => {
        //     const plans = await tx.query.plans.findMany({
        //         where: (plans, { eq }) => eq(plans.cycle, type),
        //         orderBy: (plans, { asc }) => asc(plans.price)
        //     });
        //     const launchers = await tx.query.launchers.findMany();
        //     return { plans, launchers };
        // });
        return Promise.resolve({ plans, launchers });
    } catch (error) {
        console.error(error);
        return { plans: [], launchers: [] };
    }
}
async function JoinPage() {
    const { plans, launchers } = await fetchData();
    if (!plans || plans.length === 0) {
        return (
            <div className="flex sm:flex-row flex-col sm:gap-2 gap-0  ">
                No Plans Found
            </div>
        );
    }
    return (
        <div className="max-w-6xl w-full m-auto">
            <VendorPlanBuilder plans={plans} launchers={launchers} />
        </div>
    );
}

export default JoinPage