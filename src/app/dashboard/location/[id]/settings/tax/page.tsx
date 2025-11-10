
import React from "react";
import { NewTaxRate } from "./components/";
import {
	Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription,
	Table, TableHeader, TableBody, TableCell, TableHead, TableRow
} from "@/components/ui";
import { PercentIcon } from "lucide-react";
import { db } from "@/db/db";
import { TaxRate } from "@/types";
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
						<Table>
							<TableHeader>
								<TableRow>
									{["Name", "Country", "State", "Percentage", ""].map((header) => (
										<TableHead key={header}>{header}</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{taxRates.map((taxRate, index) => (
									<TableRow key={index}>
										<TableCell>{taxRate.name}</TableCell>
										<TableCell>{taxRate.country}</TableCell>
										<TableCell>{taxRate.state}</TableCell>
										<TableCell>{taxRate.percentage}</TableCell>
										<TableCell></TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</div>
			</div>
		</TaxRateProvider>
	);
}