import {
	PaymentType,
	TaxRate,
} from "@/types";
import { isAfter, addDays, addWeeks, addMonths, addYears } from "date-fns";
import { serversideApiClient } from "@/libs/api/server";


const STRIPE_FEE_PERCENT = 2.9
const STRIPE_FEE_AMOUNT = 0.30
const STRIPE_BANK_FEE = 0.8;
function calculateStripeFeePercentage(amount: number, paymentType: PaymentType) {
	if (paymentType === 'us_bank_account') {
		return STRIPE_BANK_FEE;
	}
	const additionalPercentage = Number(((STRIPE_FEE_AMOUNT / (amount / 100)) * 100).toFixed(2))
	return Number((additionalPercentage + STRIPE_FEE_PERCENT).toFixed(2))
}

function calculateStripeFeeAmount(amount: number, paymentType: PaymentType) {
	const stripeFeePercentage = calculateStripeFeePercentage(amount, paymentType);
	return Math.floor(amount * (stripeFeePercentage / 100));
}

function calculatePeriodEnd(
	startDate: Date,
	interval: string,
	threshold: number
): Date {
	const endDate = new Date(startDate); // Initialize endDate with startDate

	switch (interval) {
		case "day":
			endDate.setDate(endDate.getDate() + threshold);
			break;
		case "week":
			endDate.setDate(endDate.getDate() + threshold * 7);
			break;
		case "month":
			endDate.setMonth(endDate.getMonth() + threshold);
			break;
		case "year":
			endDate.setFullYear(endDate.getFullYear() + threshold);
			break;
		default:
			throw new Error("Invalid plan interval");
	}
	return endDate;
}


function calculateTax(price: number, taxRates: TaxRate[]) {
	if (taxRates.length === 0) return 0;

	let tax = 0;
	let defaultTaxRate = taxRates.find((taxRate) => taxRate.isDefault);
	if (!defaultTaxRate) {
		defaultTaxRate = taxRates[0];
	}
	if (defaultTaxRate) {
		tax = Math.floor(price * (defaultTaxRate.percentage || 0) / 100);
	}

	return tax;
}

function getTaxRateId(taxRates: TaxRate[]): string | undefined {
	if (taxRates.length === 0) return undefined;
	const defaultTaxRate = taxRates.find((taxRate) => taxRate.isDefault);
	if (defaultTaxRate && defaultTaxRate.stripeRateId) {
		return defaultTaxRate.stripeRateId as string;
	} else {
		return taxRates[0].stripeRateId as string;
	}
}


function calculateTrialEnd(startDate: Date, trialDays: number): Date {
	const today = new Date();
	if (isAfter(startDate, today)) {
		return new Date(
			Math.max(startDate.getTime(), startDate.getTime() + trialDays * 24 * 60 * 60 * 1000)
		);
	} else {
		return new Date(
			Math.max(today.getTime(), today.getTime() + trialDays * 24 * 60 * 60 * 1000)
		);
	}
}



/**
 * Schedule recurring invoice email reminders for a subscription
 * Calculates all future due dates and schedules emails via BullMQ
 */
async function scheduleRecurringInvoiceEmails(params: {
	subscriptionId: string;
	memberId: string;
	locationId: string;
	memberEmail: string;
	memberFirstName: string;
	memberLastName: string;
	locationName: string;
	locationAddress: string;
	startDate: Date;
	endDate?: Date;
	interval: string;
	intervalThreshold: number;
	invoiceDetails: {
		description: string;
		items: any[];
		total: number;
		currency: string;
	};
}) {
	const apiClient = serversideApiClient();

	///request
	// - queue
	//  trigger - send email
	// trigger - check if sub is active
	// requeue

	// Calculate all future due dates
	const dueDates: Date[] = [];
	let currentDate = new Date(params.startDate);
	const maxDate = params.endDate || addYears(currentDate, 2); // Default 2 years if no end date

	while (currentDate <= maxDate) {
		dueDates.push(new Date(currentDate));

		// Calculate next due date based on interval
		switch (params.interval) {
			case 'day':
				currentDate = addDays(currentDate, params.intervalThreshold);
				break;
			case 'week':
				currentDate = addWeeks(currentDate, params.intervalThreshold);
				break;
			case 'month':
				currentDate = addMonths(currentDate, params.intervalThreshold);
				break;
			case 'year':
				currentDate = addYears(currentDate, params.intervalThreshold);
				break;
			default:
				throw new Error(`Invalid interval: ${params.interval}`);
		}

		// Safety limit: max 100 invoices scheduled at once
		if (dueDates.length >= 100) break;
	}

	// Schedule email for each due date via monstro-api
	const scheduledCount = 0;
	for (const dueDate of dueDates) {
		try {
			await apiClient.post('/protected/locations/email', {
				recipient: params.memberEmail,
				subject: `Invoice Reminder: ${params.invoiceDetails.description}`,
				template: 'InvoiceReminderEmail',
				data: {
					member: {
						firstName: params.memberFirstName,
						lastName: params.memberLastName,
						email: params.memberEmail,
					},
					invoice: {
						id: `${params.subscriptionId}-${dueDate.getTime()}`,
						total: params.invoiceDetails.total,
						dueDate: dueDate.toISOString(),
						description: params.invoiceDetails.description,
						items: params.invoiceDetails.items || [],
					},
					location: {
						name: params.locationName || '',
						address: params.locationAddress || '',
					},
					monstro: {
						fullAddress: 'PO Box 123, City, State 12345\nCopyright 2025 Monstro',
						privacyUrl: 'https://mymonstro.com/privacy',
						unsubscribeUrl: 'https://mymonstro.com/unsubscribe',
					},
				},
				sendAt: dueDate.toISOString(),
				jobId: `invoice-reminder-${params.subscriptionId}-${dueDate.getTime()}`,
			});
		} catch (error) {
			console.error(`Failed to schedule email for ${dueDate.toISOString()}:`, error);
			// Continue scheduling other emails even if one fails
		}
	}

	return scheduledCount;
}

export {
	calculatePeriodEnd,
	calculateTax,
	calculateStripeFeeAmount,
	calculateStripeFeePercentage,
	getTaxRateId,
	calculateTrialEnd,
	scheduleRecurringInvoiceEmails,
};
