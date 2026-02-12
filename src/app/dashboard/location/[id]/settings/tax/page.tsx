
import React from "react";
import { NewTaxRate, TaxList } from "./components/";
import {
	Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription,
} from "@/components/ui";
import { PercentIcon } from "lucide-react";
import { db } from "@/db/db";
import { TaxRate } from "@subtrees/types";
import { TaxRateProvider } from "./provider";


async function getTaxRates({ id }: { id: string }): Promise<TaxRate[]> {

	try {
		const taxRates = await db.query.taxRates.findMany({
			where: (taxRates, { eq }) => eq(taxRates.locationId, id),
		});
		return taxRates;
	} catch (error) {
		console.error(error);
		return [];
	}
}

export default async function SettingsPage(props: {
	params: Promise<{ id: string }>;
}) {
	const params = await props.params;
	const taxRates = await getTaxRates({ id: params.id });

	return (
		<TaxRateProvider initialTaxRates={taxRates}>
			<div className="space-y-4">
				<div className="flex justify-between items-center">
					<div className="space-y-1">
						<div className='text-xl font-semibold mb-1'>Tax Rates</div>
						<p className='text-sm'>Manage your tax rates for your location.</p>
					</div>
					<NewTaxRate lid={params.id} />
				</div>
				<div className='space-y-4 bg-foreground/5 rounded-lg'>
					{taxRates.length === 0 ? (
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<PercentIcon className='size-4' />
								</EmptyMedia>
								<EmptyTitle>No tax rates found</EmptyTitle>
								<EmptyDescription>Create your first tax rate to get started</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						<TaxList />
					)}
				</div>
			</div>
		</TaxRateProvider>
	);
}