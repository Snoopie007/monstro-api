"use client";
import { useEffect, useState } from "react";
import { useNewLocation } from "../../provider";
import { useVPMs } from "@/hooks";
import { Stripe } from "stripe";
import { cn, sleep, tryCatch } from "@/libs/utils";
import AddPaymentMethod from "./AddMethod";
import { Loader2 } from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import { useSession } from "@/hooks/useSession";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

export function ExistingPlanPayment({ lid }: { lid: string }) {
	const { locationState } = useNewLocation();
	const { data: session, update } = useSession();
	const router = useRouter();
	const { methods, isLoading } = useVPMs();

	const [paymentMethod, setPaymentMethod] =
		useState<Stripe.PaymentMethod | null>(null);
	const [loading, setLoading] = useState(false);
	const [filteredMethods, setFilteredMethods] = useState<Stripe.PaymentMethod[]>([]);

	useEffect(() => {
		if (!methods) return;
		const cardMethods = methods.filter(
			(method: Stripe.PaymentMethod) => method.card
		);
		setFilteredMethods(cardMethods);
		if (cardMethods.length > 0) {
			setPaymentMethod(cardMethods[0]);
		}
	}, [methods]);

	async function handleSubmit() {
		if (!paymentMethod) return;

		const toastRef = toast.loading("Processing payment...", {
			className: "text-sm font-medium",
		});

		setLoading(true);
		const { result, error } = await tryCatch(
			fetch(`/api/protected/account/loc/${lid}/methods`, {
				method: "POST",
				body: JSON.stringify({
					paymentMethodId: paymentMethod.id,
					state: locationState,
				}),
			})
		);
		setLoading(false);

		if (error || !result?.ok) {
			toast.update(toastRef, {
				render: "An error occurred while processing your payment.",
				type: "error",
				isLoading: false,
				autoClose: 100,
			});
			return;
		}

		await update();

		toast.update(toastRef, {
			render: "Payment successful",
			type: "success",
			isLoading: false,
			autoClose: 100,
		});

		await sleep(100);
		router.push(`/dashboard/location/${lid}`);
	}

	return (
		<div className="flex flex-col gap-2">
			<div className=" font-medium text-foreground">
				Select a payment method
			</div>
			{isLoading && (
				<div className="flex flex-col gap-2">
					{[...Array(3)].map((_, i) => (
						<Skeleton key={i} className="w-full h-10" />
					))}
				</div>
			)}
			<ul className="flex flex-col gap-2">

				{filteredMethods?.map((method, index) => (
					<MethodItem
						key={index}
						method={method}
						paymentMethod={paymentMethod}
						setPaymentMethod={setPaymentMethod}
					/>
				))}
			</ul>

			<AddPaymentMethod />

			<div className="flex justify-end">
				<Button
					variant="primary"
					size="lg"
					onClick={handleSubmit}
					disabled={loading}
				>
					{loading ? <Loader2 className=" size-4 animate-spin" /> : 'Complete'}

				</Button>
			</div>
		</div>
	);
}

interface MethodItemProps {
	method: Stripe.PaymentMethod;
	paymentMethod: Stripe.PaymentMethod | null;
	setPaymentMethod: (method: Stripe.PaymentMethod) => void;
}

function MethodItem({
	method,
	paymentMethod,
	setPaymentMethod,
}: MethodItemProps) {
	if (!method.card) return null;

	return (
		<li
			className={cn(
				"flex items-center justify-between p-3 gap-4 cursor-pointer",
				"rounded-lg hover:bg-indigo-500",
				{ "bg-indigo-500 text-white": paymentMethod?.id === method.id }
			)}
			onClick={() => setPaymentMethod(method)}
		>
			<div className="flex items-center gap-2">
				<img
					src={`/images/cards/${method.card.brand}.svg`}
					alt={method.card.brand}
					className="size-7"
				/>
				<span className="text-sm capitalize">
					{method.card.brand} •••• {method.card.last4}
				</span>
			</div>
			<span className="text-sm">
				{method.card.exp_month} / {method.card.exp_year}
			</span>
		</li>
	);
}
