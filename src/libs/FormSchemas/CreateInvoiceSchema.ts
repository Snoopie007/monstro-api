import { PaymentTypeEnum } from "@/db/schemas/DatabaseEnums";
import { z } from "zod";

export const InvoiceItemSchema = z.object({
	id: z.string().optional(), // For frontend tracking
	name: z.string().min(1, "Item name is required"),
	description: z.string().optional(),
	quantity: z
		.number()
		.min(1, "Quantity must be at least 1")
		.max(999, "Quantity cannot exceed 999"),
	price: z.number().min(0, "Price must be non-negative"), // in cents
});

export const RecurringSettingsSchema = z.object({
	interval: z.enum(["day", "week", "month", "year"], {
		message: "Please select a billing interval",
	}),
	intervalCount: z.number()
		.min(1, "Interval count must be at least 1")
		.max(12, "Interval count cannot exceed 12"),
	startDate: z.date({
		message: "Start date is required",
	}),
	endDate: z.date().optional(),
})
	.refine(
		(data) => {
			if (data.endDate && data.startDate) {
				return data.endDate > data.startDate;
			}
			return true;
		},
		{
			message: "End date must be after start date",
			path: ["endDate"],
		}
	);

export const CreateInvoiceSchema = z
	.object({
		type: z.enum(["one-off", "recurring", "from-subscription"], {
			message: "Please select an invoice type",
		}),
		description: z
			.string()
			.max(500, "Description cannot exceed 500 characters")
			.optional(),
		dueDate: z.date().optional(),
		collectionMethod: z.enum(["charge_automatically", "send_invoice"], {
			message: "Please select a collection method",
		}),
		items: z
			.array(InvoiceItemSchema)
			.max(20, "Cannot exceed 20 items"),
		isRecurring: z.boolean(),
		recurringSettings: RecurringSettingsSchema.optional(),
		paymentType: z.enum(PaymentTypeEnum.enumValues),
		selectedSubscriptionId: z.string().optional(),
	})
	.refine(
		(data) => {
			if (data.type === "recurring" && !data.recurringSettings) {
				return false;
			}
			return true;
		},
		{
			message: "Recurring settings are required for recurring invoices",
			path: ["recurringSettings"],
		}
	)
	.refine(
		(data) => {
			if (data.type === "from-subscription" && !data.selectedSubscriptionId) {
				return false;
			}
			return true;
		},
		{
			message: "Please select a subscription",
			path: ["selectedSubscriptionId"],
		}
	)
	.refine(
		(data) => {
			// Skip items validation for from-subscription type (items auto-populated by API)
			if (data.type === "from-subscription") {
				return true;
			}
			// For other types, validate items
			return data.items.length > 0 && data.items.every(item => item.name && item.price >= 0);
		},
		{
			message: "At least one valid item is required",
			path: ["items"],
		}
	)
	.refine((data) => {
		if (data.dueDate && data.dueDate < new Date()) {
			return false;
		}
		return true;
	}, {
		message: "Due date cannot be in the past",
		path: ["dueDate"],
	});

// TypeScript types
export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;
export type RecurringSettings = z.infer<typeof RecurringSettingsSchema>;
export type CreateInvoiceFormData = z.infer<typeof CreateInvoiceSchema> & {
	collectionMethod: "charge_automatically" | "send_invoice";
};

// Additional validation helpers
export const validateInvoiceTotal = (items: InvoiceItem[]): number => {
	return items.reduce((total, item) => total + item.price * item.quantity, 0);
};

export const formatInvoiceAmount = (amountInCents: number): string => {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(amountInCents / 100);
};

// Default values for form initialization
export const DEFAULT_INVOICE_FORM_VALUES: Partial<CreateInvoiceFormData> = {
  type: "one-off",
  collectionMethod: "send_invoice",
  items: [
    {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      quantity: 1,
      price: 0,
    },
  ],
  paymentType: 'cash',
  isRecurring: false,
  selectedSubscriptionId: undefined,
};

// Validation for specific use cases
export const PreviewInvoiceSchema = z.object({
	items: z.array(InvoiceItemSchema).min(1, "At least one item is required"),
});

export type PreviewInvoiceData = z.infer<typeof PreviewInvoiceSchema>;
