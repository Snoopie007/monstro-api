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
    
    // Schedule PRE-DUE reminder (5 days before)
    const preDueReminderDate = addDays(dueDate, -5);
    if (preDueReminderDate > new Date()) {
        await apiClient.post(`/x/loc/${locationId}/invoices/reminder`, {
            invoiceId,
            sendAt: preDueReminderDate.toISOString(),
        });
    }
    
    // Schedule OVERDUE CHECK (30 mins after due date)
    const overdueCheckDate = new Date(dueDate.getTime() + 30 * 60 * 1000); // 30 minutes after
    await apiClient.post(`/x/loc/${locationId}/invoices/overdue`, {
        invoiceId,
        sendAt: overdueCheckDate.toISOString(),
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

async function cancelInvoiceReminders(params: {
	invoiceId: string;
	locationId: string;
}) {
	const apiClient = serversideApiClient();
	try {
		// Cancel pre-due reminder
		await apiClient.delete(`/x/loc/${params.locationId}/invoices/reminder/${params.invoiceId}`);
		
		// Cancel overdue check/reminders
		await apiClient.delete(`/x/loc/${params.locationId}/invoices/overdue/${params.invoiceId}`);
		
		return { success: true };
	} catch (error) {
		console.error('Failed to cancel invoice reminders:', error);
		throw error;
	}
}

// Class reminder scheduling functions
async function scheduleClassReminders(params: {
	reservationId: string;
	locationId: string;
}) {
	const apiClient = serversideApiClient();
	try {
		// Schedule upcoming class reminder (3 days before)
		await apiClient.post(`/x/loc/${params.locationId}/class/reminder`, {
			reservationId: params.reservationId,
			locationId: params.locationId,
		});

		// Schedule missed class check (30 mins after class end)
		await apiClient.post(`/x/loc/${params.locationId}/class/missed`, {
			reservationId: params.reservationId,
			locationId: params.locationId,
		});

		return { success: true };
	} catch (error) {
		console.error('Failed to schedule class reminders:', error);
		throw error;
	}
}

async function scheduleRecurringClassReminders(params: {
	recurringReservationId: string;
	locationId: string;
}) {
	const apiClient = serversideApiClient();
	try {
		await apiClient.post(`/x/loc/${params.locationId}/class/recurring`, {
			recurringReservationId: params.recurringReservationId,
			locationId: params.locationId,
		});

		return { success: true };
	} catch (error) {
		console.error('Failed to schedule recurring class reminders:', error);
		throw error;
	}
}

async function cancelClassReminders(params: {
	reservationId: string;
	locationId: string;
}) {
	const apiClient = serversideApiClient();
	try {
		// Cancel upcoming class reminder
		await apiClient.delete(`/x/loc/${params.locationId}/class/reminder/${params.reservationId}`);

		// Cancel missed class check
		await apiClient.delete(`/x/loc/${params.locationId}/class/missed/${params.reservationId}`);

		return { success: true };
	} catch (error) {
		console.error('Failed to cancel class reminders:', error);
		throw error;
	}
}

async function cancelMissedClassReminder(params: {
	reservationId: string;
	locationId: string;
}) {
	const apiClient = serversideApiClient();
	try {
		await apiClient.delete(`/x/loc/${params.locationId}/class/missed/${params.reservationId}`);
		return { success: true };
	} catch (error) {
		console.error('Failed to cancel missed class reminder:', error);
		throw error;
	}
}

async function cancelRecurringClassReminders(params: {
	recurringReservationId: string;
	locationId: string;
}) {
	const apiClient = serversideApiClient();
	try {
		await apiClient.delete(`/x/loc/${params.locationId}/class/recurring/${params.recurringReservationId}`);
		return { success: true };
	} catch (error) {
		console.error('Failed to cancel recurring class reminders:', error);
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
	cancelRecurringInvoiceReminders,
	cancelInvoiceReminders,
	scheduleClassReminders,
	scheduleRecurringClassReminders,
	cancelClassReminders,
	cancelMissedClassReminder,
	cancelRecurringClassReminders
};
