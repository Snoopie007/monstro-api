import { db } from "@/db/db";
import React from "react";
import { Location } from "@/types";
import { TaxRateList, NewTaxRate } from "./components/";
import { redirect } from "next/navigation";
import { TaxRateProvider } from "./providers";

async function fetchLocation(lid: string): Promise<Location | null> {
	try {
		const location = await db.query.locations.findFirst({
			where: (location, { eq }) => eq(location.id, lid),
			with: {
				locationState: true,
			},
		});
		if (!location) {
			return null;
		}
		return location as Location & { locationState?: any };
	} catch (error) {
		console.log(error);
		return null;
	}
}

export default async function SettingsPage(props: {
	params: Promise<{ id: string }>;
}) {
	const params = await props.params;
	const location = await fetchLocation(params.id);

	if (!location) {
		return redirect("/dashboard/locations");
	}

	const { locationState } = location; // Type-guard for accessing locationState

	return (
		<TaxRateProvider initialTaxRates={locationState?.settings?.taxRates || []}>
			<div className="space-y-4">
				<div className="flex justify-between items-center">
					<div className="space-y-1">
						<div className='text-xl font-semibold mb-1'>Tax Rates</div>
						<p className='text-sm'>Manage your tax rates for your location.</p>
					</div>
					<NewTaxRate lid={params.id} />
				</div>
				<TaxRateList lid={params.id} />
			</div>
		</TaxRateProvider>
	);
}