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


async function scheduleRecurringInvoiceReminders(params: {
	subscriptionId: string;
	memberId: string;
	locationId: string;
}) {
	const apiClient = serversideApiClient();
	try {
		await apiClient.post(`/x/loc/${params.locationId}/invoices/recurring`, {
			subscriptionId: params.subscriptionId,
			memberId: params.memberId,
			locationId: params.locationId,
		})

		return {success: true};
	} catch (error) {
		console.error('Failed to schedule recurring invoice reminders:', error);
		throw error;
	}
}

// In monstro-15: When creating a one-off invoice
async function scheduleOneOffInvoiceReminders(invoiceId: string, dueDate: Date, locationId: string) {
    const apiClient = serversideApiClient();
    
    // Schedule reminder 10 days before due date
    const reminderDate = addDays(dueDate, -10);
    
    await apiClient.post(`/x/loc/${locationId}/invoices/reminder`, {
        invoiceId,
        sendAt: reminderDate.toISOString(),
    });
}

async function cancelRecurringInvoiceReminders(params: {
	subscriptionId: string;
	locationId: string;
}) {
	const apiClient = serversideApiClient();
	try {
		await apiClient.delete(`/x/loc/${params.locationId}/invoices/recurring/${params.subscriptionId}`);
		return {success: true};
	} catch (error) {
		console.error('Failed to cancel recurring invoice reminders:', error);
		throw error;
	}
}

export {
	calculatePeriodEnd,
	calculateTax,
	calculateStripeFeeAmount,
	calculateStripeFeePercentage,
	getTaxRateId,
	calculateTrialEnd,
	scheduleRecurringInvoiceReminders,
	scheduleOneOffInvoiceReminders,
	cancelRecurringInvoiceReminders
};
