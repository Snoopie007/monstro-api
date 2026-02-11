import {
	PaymentType,
	TaxRate,
} from "@/types";
import { isAfter, addDays, addWeeks, addMonths, addYears } from "date-fns";
import { serversideApiClient, ApiClientError } from "@/libs/api/server";
import { db } from "@/db/db";
import { groupMembers, integrations, memberPackages, memberSubscriptions, promos } from "@/db/schemas";
import { and, eq } from "drizzle-orm";
import Stripe from "stripe";


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

type PromoUsageType = "subscription" | "package";

type PromoValidationResult = {
	ok: boolean;
	status: number;
	code?: string;
	message?: string;
	promoId?: string;
	stripeCouponId?: string;
	discountAmount?: number;
};

function promoError(status: number, code: string, message: string): PromoValidationResult {
	return {
		ok: false,
		status,
		code,
		message,
	};
}

async function validatePromoForCheckout(params: {
	locationId: string;
	memberId: string;
	pricingId: string;
	pricingPrice: number;
	promoCode?: string;
	usageType: PromoUsageType;
}): Promise<PromoValidationResult> {
	const { locationId, memberId, pricingId, pricingPrice, promoCode, usageType } = params;

	if (!promoCode) {
		return { ok: true, status: 200 };
	}

	const normalizedPromoCode = promoCode.trim().toUpperCase();
	if (!normalizedPromoCode) {
		return promoError(400, "PROMO_NOT_FOUND", "Invalid promo code");
	}

	const promo = await db.query.promos.findFirst({
		where: and(
			eq(promos.code, normalizedPromoCode),
			eq(promos.locationId, locationId),
			eq(promos.isActive, true)
		)
	});

	if (!promo) {
		return promoError(400, "PROMO_NOT_FOUND", "Invalid promo code");
	}

	if (promo.expiresAt && new Date() > promo.expiresAt) {
		return promoError(400, "PROMO_EXPIRED", "Promo code has expired");
	}

	if (promo.maxRedemptions && promo.redemptionCount >= promo.maxRedemptions) {
		return promoError(400, "PROMO_REDEMPTION_LIMIT_REACHED", "Promo code redemption limit reached");
	}

	if (promo.duration === "once") {
		const existingUsage = usageType === "subscription"
			? await db.query.memberSubscriptions.findFirst({
				where: and(
					eq(memberSubscriptions.promoId, promo.id),
					eq(memberSubscriptions.memberId, memberId)
				)
			})
			: await db.query.memberPackages.findFirst({
				where: and(
					eq(memberPackages.promoId, promo.id),
					eq(memberPackages.memberId, memberId)
				)
			});

		if (existingUsage) {
			return promoError(400, "PROMO_ALREADY_USED", "This promo has already been used by this member");
		}
	}

	if (promo.allowedPlans && promo.allowedPlans.length > 0 && !promo.allowedPlans.includes(pricingId)) {
		return promoError(400, "PROMO_NOT_ALLOWED_FOR_PRICING", "This promo code is not valid for this pricing option");
	}

	const integration = await db.query.integrations.findFirst({
		where: (integration, { eq, and }) => and(
			eq(integration.locationId, locationId),
			eq(integration.service, "stripe")
		),
		columns: {
			id: true,
		},
	});

	if (integration) {
		if (!promo.stripeCouponId || !promo.stripePromoId) {
			return promoError(
				400,
				"PROMO_STRIPE_IDS_MISSING",
				"Promo is missing Stripe coupon or promotion code mapping"
			);
		}

		if (!process.env.STRIPE_SECRET_KEY) {
			return promoError(500, "STRIPE_CONFIG_MISSING", "Stripe platform key is not configured");
		}

		const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
			apiVersion: "2025-10-29.clover",
			appInfo: {
				name: "My Monstro",
				url: "https://monstro-x.com",
			},
		});

		try {
			const [coupon, promoCodeObject] = await Promise.all([
				stripe.coupons.retrieve(promo.stripeCouponId),
				stripe.promotionCodes.retrieve(promo.stripePromoId),
			]);

			if ("deleted" in coupon && coupon.deleted) {
				return promoError(400, "PROMO_COUPON_NOT_FOUND_IN_STRIPE", "Promo coupon no longer exists in Stripe");
			}

			const linkedCouponId =
				(promoCodeObject as unknown as { coupon?: { id?: string } | string }).coupon &&
				typeof (promoCodeObject as unknown as { coupon?: { id?: string } | string }).coupon === "string"
					? (promoCodeObject as unknown as { coupon?: string }).coupon
					: (promoCodeObject as unknown as { coupon?: { id?: string } }).coupon?.id;

			if (!linkedCouponId) {
				return promoError(400, "PROMO_STRIPE_MAPPING_INVALID", "Promotion code is not linked to a Stripe coupon");
			}

			if (linkedCouponId !== promo.stripeCouponId) {
				return promoError(400, "PROMO_STRIPE_MAPPING_INVALID", "Promotion code does not match mapped Stripe coupon");
			}
		} catch (error) {
			if (error instanceof Stripe.errors.StripeError && error.code === "resource_missing") {
				if (error.param === "discounts[0][coupon]" || error.message.includes("No such coupon")) {
					return promoError(400, "PROMO_COUPON_NOT_FOUND_IN_STRIPE", "Promo coupon no longer exists in Stripe");
				}
				return promoError(400, "PROMO_CODE_NOT_FOUND_IN_STRIPE", "Promo code no longer exists in Stripe");
			}
			console.error("Promo Stripe validation failed", {
				locationId,
				promoId: promo.id,
				stripeCouponId: promo.stripeCouponId,
				stripePromoId: promo.stripePromoId,
				error,
			});
			return promoError(500, "PROMO_STRIPE_VALIDATION_FAILED", "Failed to validate promo against Stripe");
		}
	}

	let discountAmount = 0;
	if (promo.type === "percentage") {
		discountAmount = Math.floor(pricingPrice * (promo.value / 100));
	} else if (promo.type === "fixed_amount") {
		discountAmount = Math.min(promo.value, pricingPrice);
	}

	return {
		ok: true,
		status: 200,
		promoId: promo.id,
		stripeCouponId: promo.stripeCouponId || undefined,
		discountAmount,
	};
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
	generateDiscriminator,
	validatePromoForCheckout,
};
