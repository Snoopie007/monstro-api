import {
	Button,
	Dialog,
	DialogContent,
	DialogTitle,
	DialogFooter,
	DialogClose,
	DialogBody,
	Item,
	ItemMedia,
	ItemTitle,
	ItemContent,

} from "@/components/ui";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormDescription,
	Input,
	Switch,
} from "@/components/forms";
import { Member } from "@subtrees/types";

import { DialogTrigger } from "@radix-ui/react-dialog";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { CircleFadingPlusIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { cn, StripeCardOptions } from "@/libs/utils";
import { useTheme } from "next-themes";
import { AddCreditCardSchema } from "@/libs/FormSchemas/schemas";
import { RegionSelect } from "@/components/forms";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { VisuallyHidden } from "react-aria";
import { useMemberStatus } from "../../providers";

interface AddPaymentMethodProps {
	member: Member;
	locationId: string;
}

export default function AddPaymentMethod({
	member,
	locationId,
}: AddPaymentMethodProps) {
	const [open, setOpen] = useState(false);

	const [loading, setLoading] = useState(false);
	const [validCard, setValidCard] = useState(false);
	const { setPaymentMethods } = useMemberStatus();
	const { resolvedTheme } = useTheme();
	const stripe = useStripe();
	const elements = useElements();

	const form = useForm<z.infer<typeof AddCreditCardSchema>>({
		resolver: zodResolver(AddCreditCardSchema),
		defaultValues: {
			name: "",
			type: "card",
			address: {
				line1: "",
				line2: "",
				city: "",
				state: "",
				country: "US",
				postal_code: "",
			},
		},
		mode: "onChange",
	});

	async function onSubmit(v: z.infer<typeof AddCreditCardSchema>) {
		if (!elements || !stripe || !validCard) return;
		setLoading(true);

		const cardElement = elements.getElement(CardElement);

		try {

			const tokenRef = await stripe.createToken(cardElement!, { ...v });

			if (tokenRef.token) {
				const res = await fetch(
					`/api/protected/loc/${locationId}/members/${member.id}/pms`,
					{
						method: "POST",
						body: JSON.stringify({
							tokenId: tokenRef.token.id,
							...v,
						}),
					}
				);
				if (res.ok) {
					const data = await res.json();
					setPaymentMethods((prev) => [...prev, data]);
					toast.success("Payment method added successfully", { theme: "dark" });

				}
			}
		} catch (error) {
			console.log(error);
			toast.error("Failed to add card", { theme: "dark" });
		} finally {
			setOpen(false);
			setLoading(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Item variant="outline" size="sm" className="border-foreground/10 border-dashed cursor-pointer" >
					<ItemMedia>
						<CircleFadingPlusIcon className="size-5" />
					</ItemMedia>
					<ItemContent>
						<ItemTitle>Add a Payment Method</ItemTitle>
					</ItemContent>

				</Item>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[525px] rounded-sm border-foreground/10">
				<VisuallyHidden>
					<DialogTitle></DialogTitle>
				</VisuallyHidden>
				<DialogBody>
					<Form {...form}>
						<form className=" space-y-3">
							<fieldset>
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel size="tiny">Cardholder Name</FormLabel>
											<FormControl>
												<Input
													type="text"
													placeholder="Name on card"

													{...field}
													value={
														field.value.charAt(0).toUpperCase() +
														field.value.slice(1)
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</fieldset>

							<fieldset>
								<FormField
									control={form.control}
									name="address.line1"
									render={({ field }) => (
										<FormItem>
											<FormLabel size="tiny">Billing Address</FormLabel>

											<FormControl>
												<Input
													type="text"
													placeholder="Billing Address"

													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</fieldset>
							<fieldset className="grid grid-cols-3 items-center gap-2">
								<FormField
									control={form.control}
									name="address.city"
									render={({ field }) => (
										<FormItem className="col-span-1">
											<FormControl>
												<Input
													type="text"

													placeholder="City"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="address.state"
									render={({ field }) => (
										<FormItem className="col-span-1">
											<FormControl>
												<RegionSelect
													value={field.value}
													onChange={(value) => field.onChange(value)}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="address.postal_code"
									render={({ field }) => (
										<FormItem className="col-span-1">
											<FormControl>
												<Input
													type="text"

													placeholder="Zipcode"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</fieldset>
							<fieldset>
								<FormItem className="flex-1">
									<FormLabel size="tiny">Card Info</FormLabel>
									<CardElement
										className=" bg-background  rounded-lg  p-4 w-full"
										options={{
											...StripeCardOptions,
															style: {
																base: {
																	color: resolvedTheme === "dark" ? "#fff" : "#000",
																	iconColor: resolvedTheme === "dark" ? "#fff" : "#000",
																},
															},
											hidePostalCode: true,
										}}
										onChange={(e) => {
											setValidCard(e.complete);
										}}
									/>
									<FormMessage />
								</FormItem>
							</fieldset>

						</form>
					</Form>
				</DialogBody>
				<DialogFooter className="flex flex-row gap-2 sm:justify-between">
					<DialogClose asChild>
						<Button
							type="button"
							variant="outline"
							className="border-foreground/10"
						>
							Cancel
						</Button>
					</DialogClose>
					<Button

						variant={"primary"}
						onClick={form.handleSubmit(onSubmit)}
						type="submit"
						disabled={!stripe || loading || !validCard}
					>
						{loading ? <Loader2 className=" size-4 animate-spin" /> : "Add Method"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
