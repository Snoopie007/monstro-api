
import React from 'react'


import { auth } from "@/auth";
import { VendorPlanBuilder } from "./components";
import { redirect } from 'next/navigation';
import { Location } from '@/types/location';
import { OnboardingProvider } from './provider/OnboardingProvider';


export default async function PlanSelectionPage(props: { params: Promise<{ lid: string }> }) {
    const { lid } = await props.params;

    const session = await auth();

    if (!session || session.user.locations.length === 0) {
        return redirect("/login")
    }

    const location = session.user.locations.find((location: { id: string }) => location.id === lid);

    if (!location) {
        // If location not found, redirect to first pending or active location, or dashboard
        const redirectLocation = session.user.locations.find(
            (loc: Location) => loc.status === "Pending" || loc.status === "Active"
        );
        return redirect(redirectLocation
            ? `/${redirectLocation.status === "Pending" ? "onboarding" : "dashboard"}/${redirectLocation.id}`
            : "/dashboard"
        );
    }

    if (location.status === "Active") {
        return redirect(`/dashboard/${location.id}`);
    }
    return (
        <div className="space-y-4">
            <OnboardingProvider progress={location.progress}>
                <VendorPlanBuilder />
            </OnboardingProvider>

        </div>
    );
}


