"use client";

import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui";
import {
	CreateInvoiceFormData,
	formatInvoiceAmount,
} from "@/libs/FormSchemas/CreateInvoiceSchema";
import {
	RefreshCw,
	FileText,
	InfoIcon,
	ExternalLink,
	Send,
	Eye,
} from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Badge } from "@/components/ui";
import { Separator } from "@/components/ui";

interface InvoicePreviewStepProps {
	form: UseFormReturn<CreateInvoiceFormData>;
	previewData: any;
	onPreview: (data: CreateInvoiceFormData) => Promise<void>;
	onCreate: (data: CreateInvoiceFormData) => Promise<void>;
	onBack: () => void;
	isCreating: boolean;
	isGeneratingPreview: boolean;
	memberName: string;
}

export function InvoicePreviewStep({
	form,
	previewData,
	onPreview,
	onCreate,
	onBack,
	isCreating,
	isGeneratingPreview,
	memberName,
}: InvoicePreviewStepProps) {
	const formData = form.getValues();
	
	// For from-subscription type, use preview data totals (already in cents)
	// For manual entry, calculate from items (in dollars, need to convert to cents)
	const total = formData.type === 'from-subscription' && previewData
		? previewData.amount_due / 100 // Convert from cents to dollars for display
		: formData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

	const handleRefreshPreview = () => {
		onPreview(formData);
	};

	const handleCreateInvoice = () => {
		onCreate(formData);
	};

	return (
		<div className="bg-muted/50 rounded-lg p-6 space-y-6">
			<div>
				<h3 className="text-lg font-semibold mb-2">Invoice Preview</h3>
				<p className="text-sm text-gray-600">
					Review your invoice details before creating and sending it.
				</p>
			</div>

			{/* Preview Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-2">
					<Badge
						variant={formData.type === "one-off" ? "default" : "secondary"}
					>
						{formData.type === "one-off" ? "One-off" : "Recurring"}
					</Badge>
					{formData.collectionMethod === "send_invoice" && (
						<Badge variant="outline">Manual Payment</Badge>
					)}
				</div>
			</div>

			{/* Invoice Summary */}
			<Card className="border-foreground/10 rounded-md">
				<CardHeader>
					<CardTitle className="text-base flex items-center justify-between">
						<span>Invoice Summary</span>
						<Button
							variant="outline"
							size="sm"
							onClick={handleRefreshPreview}
							disabled={isGeneratingPreview}
							className="ml-2 border-foreground/10"
						>
							{isGeneratingPreview ? (
								<RefreshCw className="w-4 h-4 animate-spin mr-2" />
							) : (
								<RefreshCw className="w-4 h-4 mr-2" />
							)}
							{isGeneratingPreview ? "Updating..." : "Refresh Preview"}
						</Button>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Invoice Details */}
					<div className="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span className="font-medium text-muted-foreground">Type:</span>
							<p className="capitalize">{formData.type}</p>
						</div>
						<div>
							<span className="font-medium text-muted-foreground">
								Collection:
							</span>
							<p className="capitalize">
								{formData.collectionMethod.replace("_", " ")}
							</p>
						</div>
						{formData.dueDate && (
							<div>
								<span className="font-medium text-muted-foreground">
									Due Date:
								</span>
								<p>{format(formData.dueDate, "PPP")}</p>
							</div>
						)}
						{formData.description && (
							<div className="col-span-2">
								<span className="font-medium text-muted-foreground">
									Description:
								</span>
								<p>{formData.description}</p>
							</div>
						)}
					</div>

					<Separator />

					{/* Line Items */}
					<div>
						<h4 className="font-medium text-muted-foreground mb-3">
							Line Items
						</h4>
						<div className="space-y-2">
							{formData.type === 'from-subscription' && previewData?.formatted_lines ? (
								// Show items from preview data (already formatted, in cents)
								previewData.formatted_lines.map((line: any, index: number) => (
									<div
										key={index}
										className="flex justify-between items-center p-3 bg-muted-foreground/10 rounded-lg"
									>
										<div className="flex-1">
											<div className="font-medium">{line.description}</div>
											<div className="text-sm text-muted-foreground">
												Qty: {line.quantity} ×{" "}
												{formatInvoiceAmount(line.amount / line.quantity)}
											</div>
										</div>
										<div className="font-medium">
											{formatInvoiceAmount(line.amount)}
										</div>
									</div>
								))
							) : (
								// Show items from form (in dollars, convert to cents for display)
								formData.items.map((item, index) => (
									<div
										key={item.id || index}
										className="flex justify-between items-center p-3 bg-muted-foreground/10 rounded-lg"
									>
										<div className="flex-1">
											<div className="font-medium">{item.name}</div>
											{item.description && (
												<div className="text-sm text-muted-foreground">
													{item.description}
												</div>
											)}
											<div className="text-sm text-muted-foreground">
												Qty: {item.quantity} ×{" "}
												{formatInvoiceAmount(item.price * 100)}
											</div>
										</div>
										<div className="font-medium">
											{formatInvoiceAmount(item.price * item.quantity * 100)}
										</div>
									</div>
								))
							)}
						</div>
					</div>

					<Separator />

					{/* Total */}
					<div className="flex justify-between items-center text-lg font-semibold">
						<span>Total:</span>
						<span className="text-blue-400">
							{formatInvoiceAmount(total * 100)}
						</span>
					</div>

					{/* Recurring Settings */}
					{formData.type === "recurring" && formData.recurringSettings && (
						<>
							<Separator />
							<div>
								<h4 className="font-medium text-muted-foreground mb-3">
									Recurring Settings
								</h4>
								<div className="grid grid-cols-2 gap-4 text-sm">
									<div>
										<span className="font-medium text-muted-foreground">
											Interval:
										</span>
										<p className="capitalize">
											Every{" "}
											{formData.recurringSettings.intervalCount > 1
												? formData.recurringSettings.intervalCount
												: ""}{" "}
											{formData.recurringSettings.interval}
											{formData.recurringSettings.intervalCount > 1 ? "s" : ""}
										</p>
									</div>
									<div>
										<span className="font-medium text-muted-foreground">
											Start Date:
										</span>
										<p>{format(formData.recurringSettings.startDate, "PPP")}</p>
									</div>
									{formData.recurringSettings.endDate && (
										<div className="col-span-2">
											<span className="font-medium text-muted-foreground">
												End Date:
											</span>
											<p>{format(formData.recurringSettings.endDate, "PPP")}</p>
										</div>
									)}
								</div>
							</div>
						</>
					)}
				</CardContent>
			</Card>

			{/* Stripe Preview Data */}
			{previewData && (
				<Card className="border-foreground/10 rounded-md">
					<CardHeader>
						<CardTitle className="text-base flex items-center">
							<FileText className="w-4 h-4 mr-2" />
							Invoice Preview
							{previewData.hosted_invoice_url && (
								<Button
									variant="outline"
									size="sm"
									className="ml-auto"
									onClick={() =>
										window.open(previewData.hosted_invoice_url, "_blank")
									}
								>
									<ExternalLink className="w-4 h-4 mr-2" />
									View in Stripe
								</Button>
							)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3 text-sm">
							<div className="grid grid-cols-2 gap-4">
								{previewData.id && (
									<div>
										<span className="font-medium text-muted-foreground">
											Preview ID:
										</span>
										<p className="font-mono text-xs">{previewData.id}</p>
									</div>
								)}
								<div className="space-x-2">
									<span className="font-medium text-muted-foreground">
										Status:
									</span>
									<Badge variant="outline" className="capitalize">
										{previewData.status || "draft"}
									</Badge>
								</div>
								<div>
									<span className="font-medium text-muted-foreground">
										Subtotal:
									</span>
									<p>{formatInvoiceAmount(previewData.subtotal || 0)}</p>
								</div>
								<div>
									<span className="font-medium text-muted-foreground">
										Tax:
									</span>
									<p>{formatInvoiceAmount(previewData.tax_total || 0)}</p>
								</div>
								<div>
									<span className="font-medium text-muted-foreground">
										Total Amount:
									</span>
									<p className="font-semibold text-blue-600">
										{formatInvoiceAmount(previewData.amount_due || 0)}
									</p>
								</div>
								<div>
									<span className="font-medium text-muted-foreground">
										Currency:
									</span>
									<p className="uppercase">{previewData.currency || "USD"}</p>
								</div>
							</div>

							{/* Customer Info */}
							{previewData.customer_info && (
								<div className="pt-3 border-t">
									<span className="font-medium text-muted-foreground">
										Customer:
									</span>
									<div className="mt-1 text-xs text-muted-foreground">
										<p>{previewData.customer_info.name}</p>
										<p>{previewData.customer_info.email}</p>
									</div>
								</div>
							)}

							{/* Enhanced Line Items from Stripe */}
							{previewData.formatted_lines?.length > 0 && (
								<div className="pt-3 border-t">
									<span className="font-medium text-muted-foreground">
										Stripe Line Items:
									</span>
									<div className="mt-2 space-y-1">
										{previewData.formatted_lines.map(
											(line: any, index: number) => (
												<div
													key={index}
													className="text-xs text-muted-foreground flex justify-between items-center"
												>
													<div className="flex-1">
														<span>{line.description}</span>
														{line.quantity > 1 && (
															<span className="text-muted-foreground ml-1">
																(x{line.quantity})
															</span>
														)}
													</div>
													<span className="font-medium">
														{formatInvoiceAmount(line.amount)}
													</span>
												</div>
											)
										)}
									</div>
								</div>
							)}

							{/* Preview Metadata */}
							{previewData.preview_metadata && (
								<div className="pt-3 border-t text-xs text-muted-foreground">
									<p>
										Preview generated at{" "}
										{format(
											new Date(previewData.preview_metadata.generated_at),
											"MMM d, yyyy 'at' h:mm a"
										)}
									</p>
									<p>Items: {previewData.preview_metadata.items_count}</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Info Notice - Different for manual vs Stripe */}
			{formData.paymentMethod === 'manual' ? (
			<div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
				<InfoIcon className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
				<div className="text-sm text-blue-800">
				<p className="font-medium mb-1">What happens next?</p>
				<ul className="space-y-1 text-xs">
					<li>• Your invoice will be created as DRAFT</li>
					<li>• Mark it as "Sent" when ready to collect payment</li>
					<li>• Mark it as "Paid" when payment is received</li>
					{formData.type === "recurring" && (
					<li>
						• You'll need to manually create invoices for future billing periods
					</li>
					)}
				</ul>
				</div>
			</div>
			) : (
			// Original Stripe flow
			<div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
				<InfoIcon className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
				<div className="text-sm text-blue-800">
				<p className="font-medium mb-1">What happens next?</p>
				<ul className="space-y-1 text-xs">
					<li>• Your invoice will be created in Stripe</li>
					<li>
					• {memberName} will receive an email with payment instructions
					</li>
					<li>• You can track payment status in the invoices list</li>
					{formData.type === "recurring" && (
					<li>
						• Recurring invoices will be automatically generated according
						to your schedule
					</li>
					)}
				</ul>
				</div>
			</div>
			)}

			{/* Action Buttons */}
			<div className="flex justify-between pt-6">
				<Button type="button" variant="outline" onClick={onBack}>
					Back
				</Button>
				<Button
				onClick={handleCreateInvoice}
				disabled={isCreating || isGeneratingPreview}
				className="bg-blue-600 hover:bg-blue-700"
				>
				<Send className="w-4 h-4 mr-2" />
				{isCreating 
					? "Creating Invoice..." 
					: formData.paymentMethod === 'cash' || formData.paymentMethod === 'manual'
					? "Create Invoice"
					: "Create & Send Invoice"
				}
				</Button>
			</div>
		</div>
	);
}
