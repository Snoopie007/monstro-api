
import React from 'react'

// async function fetchData(): Promise<MonstroPlan[]> {
//     try {
//         // const results = await db.transaction(async (tx) => {
//         //     const plans = await tx.query.plans.findMany({
//         //         where: (plans, { eq }) => eq(plans.cycle, type),
//         //         orderBy: (plans, { asc }) => asc(plans.price)
//         //     });
//         //     const launchers = await tx.query.launchers.findMany();
//         //     return { plans, launchers };
//         // });
//         return Promise.resolve(plans);
//     } catch (error) {
//         console.error(error);
//         return [];
//     }
// }

import { auth } from "@/auth";
import { VendorPlanBuilder } from "./components";

export default async function VendorOnboarding() {


    const session = await auth();
    // const { memberLocation, stripeKey } = await fetchMemberProgress(session?.user.id, params.lid);


    return (
        <VendorPlanBuilder />
    );
}


