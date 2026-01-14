"use client";
import {
	Badge,
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	Item,
	ItemActions,
	ItemContent,
	ItemMedia,
	ItemTitle,
	DropdownMenuTrigger,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
} from "@/components/ui";

import { useMemberInvoices } from "@/hooks";
import { formatAmountForDisplay } from "@/libs/utils";
import type { MemberInvoice } from "@/types";
import { format } from "date-fns";
import { CircleFadingPlusIcon, EllipsisVerticalIcon, CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import { MarkPaid } from "./MarkPaid";
interface MemberInvoiceProps {
	params: { id: string; mid: string };
}
export function MemberInvoices({ params }: MemberInvoiceProps) {
	const { invoices, mutate } = useMemberInvoices(params.id, params.mid);

	return (
		<div className="space-y-2">
			<Item
				variant="outline"
				size="sm"
				className="border-foreground/10 border-dashed cursor-pointer"
				asChild
			>
				<a
					href={`/dashboard/location/${params.id}/invoices/new?mid=${params.mid}`}
				>
					<ItemMedia>
						<CircleFadingPlusIcon className="size-5" />
					</ItemMedia>
					<ItemContent>
						<ItemTitle>Create an Invoice</ItemTitle>
					</ItemContent>
				</a>
			</Item>
			{invoices && invoices.length > 0 ? (
				<div className="space-y-2">
					{invoices.map((invoice: MemberInvoice) => (
						<InvoiceItem 
							key={invoice.id} 
							invoice={invoice} 
							params={params}
							onPaid={mutate}
						/>
					))}
				</div>
			) : (
				<Empty variant="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<CircleFadingPlusIcon className="size-5" />
						</EmptyMedia>
						<EmptyTitle>No invoices found</EmptyTitle>
						<EmptyDescription>
							Create an invoice to get started
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
		</div>
	);
}

function InvoiceItem({ 
	invoice, 
	params,
	onPaid 
}: { 
	invoice: MemberInvoice;
	params: { id: string; mid: string };
	onPaid: () => void;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [isSending, setIsSending] = useState(false);

	async function handleMarkSent() {
		setIsSending(true);
		try {
			const response = await fetch(
				`/api/protected/loc/${params.id}/members/${params.mid}/invoices/${invoice.id}/send`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
				}
			);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to mark as sent");
			}

			toast.success("Invoice marked as sent");
			onPaid();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to mark as sent");
		} finally {
			setIsSending(false);
		}
	}

	// Cash invoices can be manually marked as sent/paid
	const isManualAndDraft = 
		invoice.paymentType === "cash" && invoice.status === "draft";
	const isManualAndSent = 
		invoice.paymentType === "cash" && invoice.status === "sent";

	return (
		<Item variant="muted" className="p-3">
			<ItemMedia>
				<div className="flex flex-col gap-1">
					<Badge inv={invoice.status as any} className="capitalize w-fit">
						{invoice.status === "paid" && (
							<CheckCircle2 className="size-3 mr-1" />
						)}
						{invoice.status === "sent" && (
							<Clock className="size-3 mr-1" />
						)}
						{invoice.status}
					</Badge>
					{/* {invoice.paymentType && invoice.paymentType !== "stripe" && (
						<Badge variant="outline" className="w-fit capitalize text-xs">
							{invoice.paymentType}
						</Badge>
					)} */}
				</div>
			</ItemMedia>
			<ItemContent className="flex flex-row justify-between gap-2 items-center">
				<span className="text-sm">{invoice.description?.substring(0, 30)}</span>
				<span className="font-medium text-sm">
					{formatAmountForDisplay(
						invoice.total / 100,
						invoice.currency || "usd",
						true,
					)}
				</span>
				<span className="font-medium text-sm">
					{format(invoice.created, "MMM d, yyyy")}
				</span>
			</ItemContent>
			<ItemActions>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<EllipsisVerticalIcon className="size-4" />
					</DropdownMenuTrigger>
					<DropdownMenuContent>
					{isManualAndDraft && (
						<DropdownMenuItem onClick={handleMarkSent} disabled={isSending}>
							{isSending ? "Sending..." : "Mark as Sent"}
						</DropdownMenuItem>
					)}
					{isManualAndSent && (
						<MarkPaid
							isOpen={isOpen}
							setIsOpen={setIsOpen}
							invoice={invoice}
							params={params}
							onPaid={onPaid}
						/>
					)}
					</DropdownMenuContent>
				</DropdownMenu>
			</ItemActions>
		</Item>
	);
}
