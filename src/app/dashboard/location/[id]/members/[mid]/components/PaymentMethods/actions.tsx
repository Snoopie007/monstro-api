import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	Button,
	DropdownMenuSeparator,
} from "@/components/ui";
import { tryCatch } from "@/libs/utils";
import { PaymentMethod } from "@/types";
import { EllipsisVertical } from "lucide-react";
import { useMemberStatus } from "../../providers";
import { toast } from "sonner";

interface PaymentMethodActionsProps {
	paymentMethod: PaymentMethod;
	mid: string;
	lid: string;
}

export default function PaymentMethodsActions({
	paymentMethod,
	mid,
	lid,
}: PaymentMethodActionsProps) {
	const { paymentMethods, setPaymentMethods } = useMemberStatus();


	const PATH = `/api/protected/loc/${lid}/members/${mid}/pms`;
	async function detach(id: string) {
		const { result, error } = await tryCatch(fetch(`${PATH}/${id}`, { method: "DELETE" }));
		if (error || !result || !result.ok) {
			toast.error(error?.message ?? "Failed to detach payment method");
			return;
		}
		setPaymentMethods((prev) => prev.filter((pm) => pm.id !== id));
	}

	async function setDefault(id: string) {

		const currentDefault = paymentMethods.find((pm) => pm.isDefault);
		const { result, error } = await tryCatch(fetch(`${PATH}/${id}`, {
			method: "PATCH",
			body: JSON.stringify({ currentDefaultId: currentDefault?.id })
		}));
		if (error || !result || !result.ok) {
			toast.error(error?.message ?? "Failed to set default payment method");
			return;
		}
		setPaymentMethods((prev) => prev.map((pm) => {
			if (pm.id === id) {
				return { ...pm, isDefault: true };
			}
			return pm;
		}));
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant={"ghost"}
					className="h-auto py-0 px-0 hover:bg-transparent"
				>
					<EllipsisVertical size={16} />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-[180px] border-foreground/20 p-2">
				{paymentMethod && (
					<>
						<DropdownMenuItem
							className="cursor-pointer hover:bg-indigo-500 text-sm py-2 leading-5"
							onClick={() => setDefault(paymentMethod.id)}
						>
							<span>Default</span>
						</DropdownMenuItem>
						<DropdownMenuSeparator className="mb-2" />
						<DropdownMenuItem
							className="cursor-pointer bg-red-500 "
							onClick={() => detach(paymentMethod.id)}
						>
							<span>Remove</span>
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
