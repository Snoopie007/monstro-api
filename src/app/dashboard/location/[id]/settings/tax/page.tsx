import { db } from "@/db/db";
import React from "react";
import { Location } from "@/types";
import { MemberStripePayments } from "@/libs/server/stripe";
import { StripeTax, TaxRate, StripeRegistrations } from "./components";
import {
	Empty, EmptyHeader, EmptyMedia, EmptyTitle,
	EmptyDescription, EmptyContent, Button
} from "@/components/ui";
import { Landmark } from "lucide-react";
import Link from "next/link";

async function fetchLocation(lid: string): Promise<Location | null> {
	try {
		const location = await db.query.locations.findFirst({
			where: (location, { eq }) => eq(location.id, lid),
			with: {
				locationState: true,
			},
		});
		if (!location) {
			throw new Error("Location not found");
		}
		return location;
	} catch (error) {
		console.log(error);
		return null;
	}
}

async function fetchStripe(lid: string) {
	try {
		const integration = await db.query.integrations.findFirst({
			where: (integration, { eq, and }) =>
				and(eq(integration.locationId, lid), eq(integration.service, "stripe")),
		});

		if (!integration || !integration.accessToken) {
			return null;
		}
		const stripe = new MemberStripePayments(integration.accessToken);

		const [taxSettings, registrations] = await Promise.all([
			stripe.retrieveTaxSettings(),
			stripe.getTaxRegistrations()
		]);

		return { taxSettings, registrations };
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
	const stripeTax = await fetchStripe(params.id);

	if (!location) {
		return <div>Error loading tax registrations</div>;
	}

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<div className="text-xl font-semibold mb-1">Tax Settings</div>
				<div className="border border-foreground/10 rounded-lg space-y-4 p-4  bg-foreground/5">
					<div className=" text-base font-medium">Understand how tax works with Monstro-X</div>
					<p className="text-sm text-foreground/80">Monstro-X uses Stripe as your payment processor. And with recurring payment products such as your memberships you need to have an
						connect Stripe account in order for the tax to be calculated automatically every month.
					</p>
					<p className="text-sm text-foreground/80">
						Hoever for other standard single transaction products such as your packages you're free to use Monstro-X's tax settings by entering your tax rate.
					</p>
				</div>
			</div>

			{stripeTax ? (
				<>

					<StripeTax
						lid={params.id}
						location={location}
						taxSettings={JSON.stringify(stripeTax.taxSettings)}
					/>
					<StripeRegistrations registrations={stripeTax.registrations} />
				</>
			) : (
				<div className="bg-foreground/5 rounded-lg ">
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Landmark className="size-5" />
							</EmptyMedia>
							<EmptyTitle>No tax settings found</EmptyTitle>
							<EmptyDescription>Create your first tax settings to get started</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button variant="foreground" size="sm" asChild>
								<Link href={`/dashboard/location/${params.id}/settings/integrations`}>
									Connect Stripe
								</Link>
							</Button>
						</EmptyContent>
					</Empty>
				</div>
			)}
			<TaxRate lid={params.id} location={location} />
		</div >
	);
}
