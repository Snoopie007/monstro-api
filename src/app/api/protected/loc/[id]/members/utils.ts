import {
	PaymentType,
	TaxRate,
} from "@/types";
import { isAfter, addDays, addWeeks, addMonths, addYears } from "date-fns";
import { serversideApiClient, ApiClientError } from "@/libs/api/server";
import { db } from "@/db/db";
import { groupMembers } from "@/db/schemas";


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
 * Calculate the expiration date based on term settings.
 * Returns null if no expiration is set (ongoing subscription/package).
 */
function calculateExpiresAt(
	startDate: Date,
	expireInterval: string | null | undefined,
	expireThreshold: number | null | undefined
): Date | null {
	if (!expireInterval || !expireThreshold) {
		return null; // Ongoing, no expiration
	}

	switch (expireInterval) {
		case "day":
			return addDays(startDate, expireThreshold);
		case "week":
			return addWeeks(startDate, expireThreshold);
		case "month":
			return addMonths(startDate, expireThreshold);
		case "year":
			return addYears(startDate, expireThreshold);
		default:
			return null;
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
		if (error instanceof ApiClientError && error.status === 404) {
			console.warn('Skipping recurring invoice reminder scheduling: no invoice found yet for subscription', {
				subscriptionId: params.subscriptionId,
				locationId: params.locationId,
				details: error.body,
			});
			return { success: false, skipped: true, reason: 'invoice_not_found' };
		}
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

/**
 * Add a user to a group if groupId is provided.
 * Uses onConflictDoNothing to avoid duplicate membership errors.
 */
async function addUserToGroup(params: {
	groupId: string | null | undefined;
	userId: string;
}) {
	const { groupId, userId } = params;
	
	if (!groupId) {
		return { success: true, added: false };
	}

	try {
		await db.insert(groupMembers).values({
			groupId,
			userId,
			role: "member",
		}).onConflictDoNothing();

		console.log(`👥 Added user ${userId} to group ${groupId}`);
		return { success: true, added: true };
	} catch (error) {
		console.error('Failed to add user to group:', error);
		// Don't throw - group membership failure shouldn't fail the checkout
		return { success: false, added: false, error };
	}
}

// Generate username from name (Discord-style)
function generateUsername(name: string): string {
    const cleaned = (name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 32);
    return cleaned.length >= 2 ? cleaned : cleaned + 'user';
}

// Generate random 4-digit discriminator (0-9999)
function generateDiscriminator(): number {
    return Math.floor(Math.random() * 10000);
}

export {
	calculatePeriodEnd,
	calculateTax,
	calculateStripeFeeAmount,
	calculateStripeFeePercentage,
	getTaxRateId,
	calculateTrialEnd,
	calculateExpiresAt,
	scheduleRecurringInvoiceReminders,
	scheduleOneOffInvoiceReminders,
	cancelRecurringInvoiceReminders,
	cancelInvoiceReminders,
	scheduleClassReminders,
	scheduleRecurringClassReminders,
	cancelClassReminders,
	cancelMissedClassReminder,
	cancelRecurringClassReminders,
	addUserToGroup,
	generateUsername,
	generateDiscriminator
};
