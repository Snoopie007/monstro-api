import { useState } from "react";

import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { cn, sleep, StripeCardOptions } from "@/libs/utils";

import { Loader2, LockIcon } from "lucide-react";
import { VendorBillingSchema } from "@/libs/FormSchemas/schemas";
import { useNewLocation } from "../../provider/NewLocationContext";
import { Button } from "@/components/ui/button";

import { useSession } from "next-auth/react";
import { TermsAndConditions } from "@/components/terms";
import { FormLabel, FormItem, Form } from "@/components/forms";
import BillingFields from "./BillingFields";
import { useTheme } from "next-themes";

function handlePaymentError(toastRef: string | number, message: string) {
	toast.update(toastRef, {
		render: message,
		type: "error",
		isLoading: false,
		autoClose: 1000,
	});
}

export default function NewVendorPayment({ lid }: { lid: string }) {
	const { locationState, updateLocationState, tos } = useNewLocation();
	const [errorMessage, setErrorMessage] = useState("");
	const [loading, setLoading] = useState<boolean>(false);
	const [validCard, setValidCard] = useState<boolean>(false);
	const { data: session, update } = useSession();
	const stripe = useStripe();
	const elements = useElements();
	const router = useRouter();
	const { theme } = useTheme();

	const form = useForm<z.infer<typeof VendorBillingSchema>>({
		resolver: zodResolver(VendorBillingSchema),
		defaultValues: {
			name: "",
			address_line1: "",
			address_city: "",
			address_state: "",
			address_zip: "",
		},
		mode: "onChange",
	});

	async function onSubmit(v: z.infer<typeof VendorBillingSchema>) {
		if (!elements || !stripe) return;
		setLoading(true);
		const toastRef = toast.loading("Processing payment...", {
			className: "text-sm font-medium ",
		});

		const cardElement = elements!.getElement(CardElement);
		try {
			const tokenRef = await stripe.createToken(cardElement!, { ...v });

			if (tokenRef.token) {
				const res = await fetch(
					`/api/protected/vendor/locations/${lid}/checkout`,
					{
						method: "POST",
						body: JSON.stringify({
							vendorId: session?.user.vendorId,
							token: tokenRef.token,
							state: locationState,
						}),
					}
				);
				setLoading(false);
				if (!res.ok) {
					return handlePaymentError(
						toastRef,
						"An error occurred while processing your payment."
					);
				}

				await update({
					locations: session?.user.locations.map(
						(location: { id: string; status: string }) => {
							return location.id === locationState.locationId
								? { ...location, status: "active" }
								: location;
						}
					),
				});
				toast.update(toastRef, {
					render: "Payment successful",
					type: "success",
					isLoading: false,
					autoClose: 100,
				});
				await sleep(100);
				router.push(`/dashboard/location/${lid}`);
			} else {
				setLoading(false);
				return handlePaymentError(toastRef, "Invalid Card.");
			}
		} catch (e: unknown) {
			console.log(e);
			setLoading(false);
			return handlePaymentError(
				toastRef,
				"Your payment was declined by your bank, please talk to support."
			);
		}
	}

	return (
		<div className="space-y-3 pb-3 ">
			<div className="flex flex-col gap-2  border border-foreground/10 rounded-sm p-4 pb-6 space-y-3 shadow-xs">
				<Form {...form}>
					<form>
						<BillingFields form={form} />
						<fieldset>
							<FormItem className=" ">
								<FormLabel className="text-[0.58rem] uppercase font-semibold">
									Card details
								</FormLabel>
								<CardElement
									className={cn(
										"border border-foreground/10  py-2.5 h-auto rounded-lg   w-full px-4"
									)}
									options={{
										...StripeCardOptions,
										hidePostalCode: true,
										style: {
											base: {
												color: theme === "dark" ? "#fff" : "#000",
											},
										},
									}}
									onChange={(e) => {
										setErrorMessage(
											e.error
												? e.error.message
													? e.error.message
													: "An unknown error occured"
												: ""
										);
										setValidCard(e.complete);
									}}
								/>

								<span className="flex flex-row items-center  text-foreground/50">
									<LockIcon size={12} className="" />
									<span className="text-xs leading-none">
										This is secure 128-bit SSL encrypted payment.
									</span>
								</span>
							</FormItem>
						</fieldset>
					</form>
				</Form>

				<TermsAndConditions
					checked={locationState.agreeToTerms}
					tos={tos}
					setChecked={(checked) =>
						updateLocationState({
							...locationState,
							agreeToTerms: checked,
						})
					}
				/>
			</div>
			<div className="flex justify-end">
				<Button
					variant={"continue"}
					className={cn("cursor-pointer", {
						"children:inline-block": loading,
						"children:hidden": !loading,
					})}
					onClick={form.handleSubmit(onSubmit)}
					disabled={
						loading ||
						!form.formState.isValid ||
						!locationState.agreeToTerms ||
						!validCard
					}
				>
					<Loader2 className="mr-2 size-4 animate-spin" />
					Register
				</Button>
			</div>
		</div>
	);
}
