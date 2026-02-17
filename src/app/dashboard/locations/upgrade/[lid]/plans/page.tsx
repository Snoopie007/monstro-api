import React from "react";
import { redirect } from "next/navigation";
import { admindb, db } from "@/db/db";
import {
    ScrollArea,
} from "@/components/ui";
import { MonstroPlan } from '@/types/monstro';
import { CompareTable } from "../../../components";
import { UpgradeSelector } from "./components";


async function getLocationState(lid: string) {
    try {
        const locationState = await db.query.locationState.findFirst({
            where: (locationState, { eq }) => eq(locationState.locationId, lid),
        });
        return locationState;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function getPlans(): Promise<MonstroPlan[] | null> {
    try {
        const plans = await admindb.query.monstroPlans.findMany({
            where: (plans, { not, eq }) => not(eq(plans.name, "Grandfather")),
            orderBy: (plans, { asc }) => [asc(plans.price)],
        });
        return plans;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export default async function UpgradePage(props: {
    params: Promise<{ lid: string }>;
}) {
    const { lid } = await props.params;


    const locationState = await getLocationState(lid);
    if (!locationState) {
        return redirect("/dashboard/locations/new");
    }

    if (locationState.planId === null) {
        return redirect(`/dashboard/locations/new/${lid}`);
    }

    const plans = await getPlans();

    if (!plans) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                Something went wrong, please try again later
            </div>
        );
    }
    return (
        <div className="space-y-4">
            <ScrollArea className="h-[calc(100vh-44px)] ">
                <div className="max-w-2xl mx-auto pb-20 space-y-4">
                    <UpgradeSelector lid={lid} plans={plans} locationState={locationState} />
                    <CompareTable plans={plans} />

                </div>
            </ScrollArea>
        </div>
    );
}
