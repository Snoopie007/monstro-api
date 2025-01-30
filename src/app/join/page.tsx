
import React from 'react'
import { plans, addons, MonstroPlan, Addon, } from './dummy-data';
import VendorPlanBuilder from './components/builder';


async function fetchData(): Promise<MonstroPlan[]> {
    try {
        // const results = await db.transaction(async (tx) => {
        //     const plans = await tx.query.plans.findMany({
        //         where: (plans, { eq }) => eq(plans.cycle, type),
        //         orderBy: (plans, { asc }) => asc(plans.price)
        //     });
        //     const launchers = await tx.query.launchers.findMany();
        //     return { plans, launchers };
        // });
        return Promise.resolve(plans);
    } catch (error) {
        console.error(error);
        return [];
    }
}
async function JoinPage() {
    const plans = await fetchData();
    if (!plans || plans.length === 0) {
        return (
            <div className="flex sm:flex-row flex-col sm:gap-2 gap-0  ">
                No Plans Found
            </div>
        );
    }
    return (
        <div className="max-w-3xl w-full m-auto">
            <VendorPlanBuilder plans={plans} />
        </div>
    );
}

export default JoinPage