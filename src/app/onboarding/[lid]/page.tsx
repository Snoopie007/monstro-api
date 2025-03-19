
import React from 'react'
import { auth } from "@/auth";
import { VendorPlanBuilder } from "./components";
import { redirect } from 'next/navigation';
import { OnboardingProvider } from './provider/OnboardingProvider';
import { db } from '@/db/db';
import { decodeId } from '@/libs/server/sqids';
import { getTOS } from '@/libs/server/MDXParse';


async function getLocationState(locationId: string) {
    const locationState = await db.query.locationState.findFirst({
        where: (locationState, { eq }) => eq(locationState.locationId, decodeId(locationId))
    })
    return locationState
}


export default async function PlanSelectionPage(props: { params: Promise<{ lid: string }> }) {
    const { lid } = await props.params;

    const session = await auth();
    const tos = await getTOS("term-of-use")
    if (!session || session.user.locations.length === 0) {
        return redirect("/login")
    }


    const locationState = await getLocationState(lid);
    if (!locationState) {
        return redirect("/onboarding")
    }
    return (
        <div className="space-y-4">
            <OnboardingProvider state={locationState} tos={tos}>
                <VendorPlanBuilder />
            </OnboardingProvider>

        </div>
    );
}


