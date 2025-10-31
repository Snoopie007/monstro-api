import React from "react";
import { auth } from "@/auth";
import { VendorPlanBuilder } from "./components";
import { redirect } from "next/navigation";
import { NewLocationProvider } from "./provider";
import { admindb, db } from "@/db/db";
import { getTOS } from "@/libs/server/MDXParse";
import {
	ScrollArea,
} from "@/components/ui";
import { MonstroPlan } from "@/types/admin";
import { CompareTable, FAQs } from "../../components";


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

export default async function PlanSelectionPage(props: {
	params: Promise<{ lid: string }>;
}) {
	const { lid } = await props.params;

	const session = await auth();

	if (!session || session.user.locations.length === 0) {
		return redirect("/login");
	}

	const locationState = await getLocationState(lid);
	if (!locationState) {
		return redirect("/dashboard/locations/new");
	}

	const tos = await getTOS("term-of-use");
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
			<NewLocationProvider
				state={locationState}
				tos={tos}
				plans={plans}
			>
				<ScrollArea className="h-[calc(100vh-44px)] ">
					<div className="max-w-2xl mx-auto pb-20 space-y-4">
						<VendorPlanBuilder lid={lid} />
						<CompareTable plans={plans} />
						<FAQs />
					</div>
				</ScrollArea>
			</NewLocationProvider>
		</div>
	);
}
