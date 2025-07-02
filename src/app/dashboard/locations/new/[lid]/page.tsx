import React from "react";
import { auth } from "@/auth";
import { VendorPlanBuilder } from "./components";
import { redirect } from "next/navigation";
import { NewLocationProvider } from "./provider/NewLocationContext";
import { admindb, db } from "@/db/db";
import { getTOS } from "@/libs/server/MDXParse";

async function getLocationState(lid: string) {
  try {
    const locationState = await db.query.locationState.findFirst({
      where: (locationState, { eq }) => eq(locationState.locationId, lid),
    });

    return locationState;
  } catch (error) {
    console.error(error);
  }
}

async function getPackagesAndPlans() {
  try {
    const plans = await admindb.query.monstroPlans.findMany({
      where: (plans, { not, eq }) => not(eq(plans.name, "Grandfather")),
    });

    const packages = await admindb.query.monstroPackages.findMany({
      with: {
        paymentPlans: true,
      },
    });
    return { plans, packages };
  } catch (error) {
    console.error(error);
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
  const pnp = await getPackagesAndPlans();

  if (!pnp) {
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
        plans={pnp.plans}
        packages={pnp.packages}
      >
        <div className="flex flex-col max-w-xl mx-auto p-4 h-screen">
          <VendorPlanBuilder lid={lid} />
        </div>
      </NewLocationProvider>
    </div>
  );
}
