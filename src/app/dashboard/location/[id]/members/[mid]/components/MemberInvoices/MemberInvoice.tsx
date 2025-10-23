"use client";
import {
	Badge,
	Button,
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
} from "@/components/ui";
import { useMemberInvoices } from "@/hooks";
import { formatAmountForDisplay } from "@/libs/utils";
import type { MemberInvoice } from "@/types";
import { format } from "date-fns";
import { CircleFadingPlusIcon, EllipsisVerticalIcon } from "lucide-react";

interface MemberInvoiceProps {
	params: { id: string; mid: string };
}
export function MemberInvoices({ params }: MemberInvoiceProps) {
	const { invoices } = useMemberInvoices(params.id, params.mid);

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
						<InvoiceItem key={invoice.id} invoice={invoice} />
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

function InvoiceItem({ invoice }: { invoice: MemberInvoice }) {
	return (
		<Item variant="muted" className="p-3 ">
			<ItemMedia>
				<Badge inv={invoice.status} className="capitalize">
					{invoice.status}
				</Badge>
			</ItemMedia>
			<ItemContent className="flex flex-row justify-between gap-2 items-center">
				<span>{invoice.description?.substring(0, 30)}</span>
				<span className="font-medium">
					{formatAmountForDisplay(
						invoice.total / 100,
						invoice.currency || "usd",
						true,
					)}
				</span>
				<span className="font-medium">
					{format(invoice.created, "MMM d, yyyy")}
				</span>
			</ItemContent>
			<ItemActions>
				<Button variant="ghost" size="icon" className="size-6 ">
					<EllipsisVerticalIcon className="size-4" />
				</Button>
			</ItemActions>
		</Item>
	);
}
