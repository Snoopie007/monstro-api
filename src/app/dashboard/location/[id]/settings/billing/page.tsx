import {
	Table,
	TableBody,
	TableHeader,
	TableCell,
	TableHead,
	TableRow,
	Badge,
	Button,
	DropdownMenuTrigger,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
} from "@/components/ui";

import Link from "next/link";
import React from "react";

import { cn, formatAmountForDisplay } from "@/libs/utils";
import { authWithContext } from "@/libs/auth/server";
import { VendorStripePayments } from "@/libs/server/stripe";
import { LocationState } from "@/types";
import { Stripe } from "stripe";
import { RetryPayment, CardList, Wallet } from "./components";
import { db } from "@/db/db";
import { AlertCircleIcon, EllipsisVertical } from "lucide-react";
import { format } from "date-fns";

type Subscription = {
	subscriptionId: string | null;
	name: string;
	amount: number;
	nextInvoice: string;
	endDate: string;
	currency: string;
	status:
	| "active"
	| "incomplete"
	| "past_due"
	| "paused"
	| "canceled"
	| "unpaid"
	| "incomplete_expired"
	| "trialing"
	| null;
	invoiceId: string | Stripe.Invoice | null;
};
async function fetchClientStripe(
	customerId: string,
	locationId: string,
	locationState: LocationState
) {
	try {
		let subscriptions: Subscription[] = [{
			subscriptionId: null,
			name: "Free",
			amount: 0,
			nextInvoice: "N/A",
			endDate: "N/A",
			currency: "USD",
			status: "active",
			invoiceId: null,
		}];
		const stripe = new VendorStripePayments();
		const methods = await stripe.getPaymentMethods(customerId);
		if (locationState.planId && locationState.planId !== 1) {
			const res = await stripe.getSubscriptions(customerId);

			subscriptions = res.data.filter((sub) => sub.metadata.locationId === locationId).map((sub) => {
				const item = sub.items.data[0];

				return {
					subscriptionId: sub.id,
					name: item?.plan?.nickname || "N/A",
					amount: item?.plan?.amount || 0,
					nextInvoice: format(item.current_period_end * 1000, "MMM d, yyyy"),
					endDate: sub.cancel_at
						? format(sub.cancel_at * 1000, "MMM d, yyyy")
						: "N/A",
					currency: item?.plan?.currency || "USD",
					status: sub.status,
					invoiceId: sub.latest_invoice,
				};
			});
		}

		return { paymentMethods: methods.data, subscriptions };
	} catch (error) {
		console.log("Error ", error);
		return { paymentMethods: [], subscriptions: [] };
	}
}

async function getLocationState(id: string) {
	try {
		const locationState = await db.query.locationState.findFirst({
			where: (state, { eq }) => eq(state.locationId, id),
		});
		return locationState;
	} catch (error) {
		console.log("Error ", error);
	}
}

export default async function BillingPage(props: {
	params: Promise<{ id: string }>;
}) {
	const params = await props.params;
	const sesson = await authWithContext();
	const locationState = await getLocationState(params.id);

	const { paymentMethods, subscriptions } = await fetchClientStripe(
		sesson?.user.stripeCustomerId,
		params.id,
		locationState!
	);

	function calculateMonthlyTotal() {
		const total = subscriptions.reduce((total, sub) => {
			if (sub.amount) {
				return total + sub.amount;
			}
			return total;
		}, 0);

		return formatAmountForDisplay(
			total / 100,
			subscriptions[0]?.currency || "USD",
			true
		);
	}

	return (
		<div className="space-y-4">
			{locationState?.status !== "active" && (
				<div className=" bg-red-500 text-white rounded-sm py-3 px-4 flex items-center gap-2">
					<AlertCircleIcon size={16} className="" />
					<p className="text-sm">
						Your account is not active. Please clear your balance or contact
						support.
					</p>
				</div>
			)}
			<div className="border-foreground/10 bg-foreground/5 rounded-lg p-6 space-y-4">

				<div className="flex flex-row items-center justify-between">
					<div className="font-medium ">
						Monstro-X Subscriptions
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="size-8">
								<EllipsisVertical className="size-5" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="border-foreground/5">
							<DropdownMenuItem>
								<Link href={`/dashboard/locations/upgrade/${params.id}/plans`}>
									Change Plan
								</Link>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				<div className="space-y-2">
					<Table className="w-full border-b border-foreground/10 mb-4">
						<TableHeader>
							<TableRow>
								{["Plan", "Amount", "Next Invoice", "End Date", ""].map(
									(header, i) => (
										<TableHead key={header} className={cn(
											"h-auto font-normal  py-2",
											i === 0 && "pl-0"
										)} >
											{header}
										</TableHead>
									)
								)}
							</TableRow>
						</TableHeader>
						<TableBody>
							{subscriptions.length > 0 ? (
								subscriptions.map((sub, i) => (
									<TableRow key={i}>
										<TableCell className="pl-0">
											{sub.name}
											<Badge sub={sub.status} className="ml-2">
												{sub.status?.replace("_", " ")}
											</Badge>
										</TableCell>
										<TableCell>
											{formatAmountForDisplay(
												sub.amount / 100,
												sub.currency,
												true
											)}
										</TableCell>
										<TableCell>{sub.nextInvoice}</TableCell>
										<TableCell>{sub.endDate}</TableCell>
										<TableCell className="text-right">
											{["past_due", "unpaid"].includes(sub.status || "") && (
												<RetryPayment
													subscription={sub}
													invoiceId={sub.invoiceId}
													paymentMethods={paymentMethods}
													lid={params.id}
												/>
											)}
										</TableCell>
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell colSpan={4} className="text-center">
										No subscriptions found
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
					<p className="font-medium">Total: {calculateMonthlyTotal()}</p>

				</div>

			</div>
			<Wallet lid={params.id} />
			<CardList
				paymentMethods={paymentMethods}
				customerId={sesson?.user.stripeCustomerId}
				locationId={params.id}
			/>
		</div>
	);
}
