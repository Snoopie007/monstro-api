import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, inArray, sql } from "drizzle-orm";
import { Elysia } from "elysia";
import { z } from "zod";
import { db } from "@/db/db";
import { EmailSender } from "@/libs/email";
import { StripePaymentGateway } from "@/libs/PaymentGateway";
import type { AuthXContext } from "@/middlewares/AuthMW";
import {
    CourseEnrollError,
    handleCourseEnrollFree,
    handleCourseEnrollPaid,
} from "@/handlers/course";
import {
    EventRegistrationError,
    handleFreeEventRegistration,
    handlePaidEventRegistration,
} from "@/handlers/event";
import { getAuthorizePaymentMethods } from "@/handlers/paymentMethods/authorize";
import { getSquarePaymentMethods } from "@/handlers/paymentMethods/square";
import {
    accounts,
    courseEnrollments,
    courses,
    eventTickets,
    memberBulkRunItems,
    memberBulkRuns,
    memberLocations,
    memberPackages,
    members,
    memberSubscriptions,
    transactions,
} from "@/subtrees/schemas";
import { dispatchPaymentFailed } from "@/subtrees/utils/server/workflows";
import { isPaymentDecline, paymentFailureFromError } from "@/subtrees/utils/workflow/payments";
import {
    CheckoutError,
    chargeWithGateway,
    getCheckoutContext,
    PaymentChargeError,
    type ChargeWithGatewayResult,
} from "@/utils";

type ItemOutcome = {
    status: "succeeded" | "failed" | "skipped" | "needs_review" | "canceled";
    code?: string;
    message: string;
    details?: Record<string, unknown>;
};

const RunInputSchema = z.object({
    eventId: z.string().optional(),
    ticketId: z.string().optional(),
    courseId: z.string().optional(),
    amount: z.number().int().min(100).optional(),
    item: z.string().optional(),
    description: z.string().optional(),
    includeNonDefaultCards: z.boolean().optional(),
    /** Ticket or course price (cents, 0 when free) that the run was approved and permission-checked at. */
    unitPrice: z.number().int().min(0).optional(),
});

const emailSender = new EmailSender();

/**
 * Runs one member of a bulk run. The worker claims the member first (status `processing`)
 * and calls this route with the service key; this route writes the member's result.
 * Unexpected errors return 500 and leave the member claimed, so the worker retries it
 * after the claim expires. The worker passes its attempt number; only that attempt may
 * run the member and write its result.
 *
 * A paid action is never sent to the gateway twice. A bulk charge records a pending
 * transaction first. A paid registration or enrollment marks the member first, because
 * its checkout handler charges with a new payment key on every call; a later attempt
 * that finds the mark asks staff to check instead of charging again.
 */
export const xBulkRuns = new Elysia({ prefix: "/bulk-runs" })
    .post("/items/:itemId", async (ctx) => {
        const { params, status, isServiceRole } = ctx as typeof ctx & AuthXContext;
        if (!isServiceRole) return status(403, { error: "Service role required" });
        const { lid, itemId } = params as { lid: string; itemId: string };

        const [row] = await db
            .select({ item: memberBulkRunItems, run: memberBulkRuns })
            .from(memberBulkRunItems)
            .innerJoin(memberBulkRuns, eq(memberBulkRuns.id, memberBulkRunItems.runId))
            .where(and(eq(memberBulkRunItems.id, itemId), eq(memberBulkRuns.locationId, lid)));
        if (!row) return status(404, { error: "Bulk run member not found" });

        const { item, run } = row;
        if (item.status !== "processing") {
            return { status: item.status, message: item.message ?? "Already finished" };
        }

        // Take the member for this attempt and hold it while the action runs. If this request dies, the
        // worker claims the member again after the hold expires, with a new attempt number.
        const attempt = Number((ctx.query as { attempt?: string } | undefined)?.attempt);
        const [owned] = await db.update(memberBulkRunItems)
            .set({ leaseUntil: sql`now() + interval '10 minutes'`, updated: new Date() })
            .where(and(
                eq(memberBulkRunItems.id, item.id),
                eq(memberBulkRunItems.status, "processing"),
                eq(memberBulkRunItems.attempts, attempt),
            ))
            .returning({ id: memberBulkRunItems.id });
        if (!owned) return status(409, { error: "Another attempt owns this member" });

        const parsedInput = RunInputSchema.safeParse(run.input);
        const input = parsedInput.success ? parsedInput.data : {};
        const mid = item.memberId;
        let outcome: ItemOutcome;
        // Set once a paid registration or enrollment is handed to its checkout handler.
        let startedCharge = null as Record<string, unknown> | null;
        const unconfirmedCharge: ItemOutcome = {
            status: "needs_review",
            code: "PAYMENT_UNCONFIRMED",
            message: "A charge was started but not confirmed. Check the member's transactions before charging again.",
        };

        try {
            if (item.details.chargeStarted) {
                // An earlier attempt reached the checkout handler and never reported back.
                outcome = { ...unconfirmedCharge, details: item.details };
            } else if (run.status === "canceled") {
                outcome = { status: "canceled", message: "Run was canceled" };
            } else if (!parsedInput.success) {
                outcome = { status: "failed", code: "INVALID_INPUT", message: "This run's settings are invalid" };
            } else {
                outcome = await (async (): Promise<ItemOutcome> => {
                    const memberLocation = await db.query.memberLocations.findFirst({
                        where: and(eq(memberLocations.memberId, mid), eq(memberLocations.locationId, lid)),
                        columns: { memberId: true, status: true },
                    });
                    if (!memberLocation) {
                        return { status: "failed", code: "NOT_IN_LOCATION", message: "Member is not in this location" };
                    }

                    // Work out whether this member needs a card before running the action.
                    const ticket = run.action === "register_event" && input.eventId && input.ticketId
                        ? await db.query.eventTickets.findFirst({
                            where: and(eq(eventTickets.id, input.ticketId), eq(eventTickets.eventId, input.eventId)),
                        })
                        : null;
                    const course = run.action === "enroll_course" && input.courseId
                        ? await db.query.courses.findFirst({
                            where: and(eq(courses.id, input.courseId), eq(courses.locationId, lid)),
                            columns: { id: true, title: true, price: true, status: true },
                        })
                        : null;
                    const freeTicket = Boolean(ticket && ticket.pricingMethod === "free" && ticket.price <= 0);
                    const paidTicket = Boolean(ticket && ticket.pricingMethod !== "free" && ticket.price > 0);
                    const needsCard = run.action === "charge"
                        || paidTicket
                        || (run.action === "enroll_course" && (course?.price ?? 0) > 0);

                    // Permissions and the paid-member cap were checked against the price when the run started.
                    // Never charge a different price, or charge for something that was free then.
                    if ((ticket && (paidTicket ? ticket.price : 0) !== input.unitPrice) || (course && course.price !== input.unitPrice)) {
                        return {
                            status: "failed",
                            code: "PRICE_CHANGED",
                            message: "The price changed after this run started. Start a new run to use the new price.",
                        };
                    }

                    // Card rule: the default card, or with includeNonDefaultCards the only card,
                    // or on Stripe the newest card (Stripe lists newest first).
                    let card: { id: string; brand?: string; last4?: string } | null = null;
                    if (needsCard) {
                        let checkout: Awaited<ReturnType<typeof getCheckoutContext>>;
                        try {
                            checkout = await getCheckoutContext({ lid, mid });
                        } catch (error) {
                            if (error instanceof CheckoutError) {
                                return { status: "skipped", code: "NO_CARD", message: "No card on file" };
                            }
                            throw error;
                        }

                        let cards: { id: string; brand?: string; last4?: string; isDefault: boolean }[] = [];
                        if (checkout.gateway.service === "stripe") {
                            const stripe = new StripePaymentGateway(checkout.gateway.accessToken);
                            const [customer, methods] = await Promise.all([
                                stripe.getCustomer(checkout.gatewayCustomerId),
                                stripe.getPaymentMethods(checkout.gatewayCustomerId, { type: "card", limit: 100 }),
                            ]);
                            const defaultMethod = customer?.invoice_settings?.default_payment_method;
                            const defaultId = typeof defaultMethod === "string" ? defaultMethod : defaultMethod?.id;
                            cards = methods.map((method) => ({
                                id: method.id,
                                brand: method.card?.brand,
                                last4: method.card?.last4 ?? undefined,
                                isDefault: method.id === defaultId,
                            }));
                        } else {
                            const methods = checkout.gateway.service === "square"
                                ? await getSquarePaymentMethods(mid, lid)
                                : await getAuthorizePaymentMethods(mid, lid);
                            cards = methods
                                .filter((method) => method.type === "card")
                                .map((method) => ({
                                    id: method.id,
                                    brand: method.card?.brand,
                                    last4: method.card?.last4 ?? undefined,
                                    isDefault: method.isDefault,
                                }));
                        }

                        card = cards.find((candidate) => candidate.isDefault) ?? null;
                        if (!card && input.includeNonDefaultCards) {
                            if (cards.length === 1) card = cards[0] ?? null;
                            else if (cards.length > 1 && checkout.gateway.service === "stripe") card = cards[0] ?? null;
                        }
                        if (!card) {
                            if (cards.length === 0) return { status: "skipped", code: "NO_CARD", message: "No card on file" };
                            return input.includeNonDefaultCards
                                ? { status: "skipped", code: "SEVERAL_CARDS", message: "Several cards on file and none is marked default" }
                                : { status: "skipped", code: "NO_DEFAULT_CARD", message: "No card is marked default" };
                        }
                    }
                    const cardLabel = card ? `${card.brand ?? "Card"} •••• ${card.last4 ?? "????"}` : undefined;
                    const cardDetails = card ? { paymentMethodId: card.id, brand: card.brand, last4: card.last4 } : {};

                    switch (run.action) {
                        case "archive": {
                            const [subscription, pkg] = await Promise.all([
                                db.query.memberSubscriptions.findFirst({
                                    where: and(
                                        eq(memberSubscriptions.memberId, mid),
                                        eq(memberSubscriptions.locationId, lid),
                                        inArray(memberSubscriptions.status, ["active", "trialing", "past_due", "paused"]),
                                    ),
                                    columns: { id: true },
                                }),
                                db.query.memberPackages.findFirst({
                                    where: and(
                                        eq(memberPackages.memberId, mid),
                                        eq(memberPackages.locationId, lid),
                                        eq(memberPackages.status, "active"),
                                    ),
                                    columns: { id: true },
                                }),
                            ]);
                            if (subscription || pkg) {
                                return { status: "skipped", code: "ACTIVE_PLAN", message: "Has an active plan. Cancel the plan first." };
                            }
                            if (memberLocation.status === "archived") {
                                return { status: "skipped", code: "ALREADY_ARCHIVED", message: "Already deleted from this location" };
                            }
                            // Archive only this location's membership; the member may belong to other locations.
                            await db.update(memberLocations)
                                .set({ status: "archived", updated: new Date() })
                                .where(and(eq(memberLocations.memberId, mid), eq(memberLocations.locationId, lid)));
                            return { status: "succeeded", message: "Deleted from this location" };
                        }

                        case "resend_invite": {
                            return await db.transaction(async (tx): Promise<ItemOutcome> => {
                                // Email edits use this same member lock. Read and send the saved account after locking.
                                const [locked] = await tx.select({ id: members.id }).from(members)
                                    .where(eq(members.id, mid)).for("update");
                                if (!locked) return { status: "failed", code: "NOT_FOUND", message: "Member not found" };

                                const ml = await tx.query.memberLocations.findFirst({
                                    where: and(eq(memberLocations.memberId, mid), eq(memberLocations.locationId, lid)),
                                    with: {
                                        member: {
                                            with: {
                                                user: {
                                                    with: { accounts: { columns: { id: true, provider: true, accountId: true } } },
                                                },
                                            },
                                        },
                                        location: { columns: { name: true } },
                                    },
                                });
                                if (!ml) return { status: "failed", code: "NOT_IN_LOCATION", message: "Member is not in this location" };
                                if (ml.member.setupCompleted) {
                                    return { status: "skipped", code: "ALREADY_SET_UP", message: "Already finished account setup" };
                                }
                                if (!ml.member.user?.accounts.length) {
                                    return { status: "skipped", code: "NO_ACCOUNT", message: "No sign-in account" };
                                }
                                const recipient = ml.member.email;
                                if (!z.email().safeParse(recipient).success) {
                                    return { status: "skipped", code: "INVALID_EMAIL", message: "No valid email on file" };
                                }

                                const credential = ml.member.user.accounts.find((account) => account.provider === "credential");
                                let tempPassword: string | undefined;
                                if (credential) {
                                    tempPassword = randomBytes(12).toString("base64url");
                                    const password = await bcrypt.hash(tempPassword, 10);
                                    const [updated] = await tx.update(accounts).set({ password, updated: new Date() })
                                        .where(and(
                                            eq(accounts.id, credential.id),
                                            eq(accounts.userId, ml.member.userId),
                                            eq(accounts.provider, "credential"),
                                        ))
                                        .returning({ id: accounts.id });
                                    if (!updated) return { status: "failed", code: "ACCOUNT_CHANGED", message: "The sign-in account changed during the run" };
                                }

                                try {
                                    await emailSender.sendWithTemplate({
                                        options: {
                                            to: recipient,
                                            subject: `Welcome to ${ml.location.name} - ${credential ? "Your Monstro Account" : "Monstro"}`,
                                        },
                                        template: credential ? "MemberWelcomeNewAccountEmail" : "MemberWelcomeExistingAccountEmail",
                                        data: {
                                            member: {
                                                firstName: ml.member.firstName,
                                                email: credential?.accountId || ml.member.email,
                                            },
                                            location: { name: ml.location.name },
                                            ...(tempPassword ? { tempPassword } : {}),
                                            iosAppUrl: "https://apps.apple.com/us/app/monstro-x/id6749905276",
                                            androidAppUrl: "https://play.google.com/store/apps/details?id=com.monstro.monstrox",
                                        },
                                    });
                                } catch (error) {
                                    console.error("[Bulk Runs] Invitation email failed", { itemId, error });
                                    // Commit the reset even if delivery fails, and make its outcome explicit.
                                    return {
                                        status: "failed",
                                        code: "EMAIL_FAILED",
                                        message: credential
                                            ? "Password was reset, but the email could not be sent"
                                            : "The invitation email could not be sent",
                                        details: { passwordReset: Boolean(credential) },
                                    };
                                }
                                return {
                                    status: "succeeded",
                                    message: credential ? `Sent to ${recipient} with a new password` : `Sent to ${recipient}`,
                                    details: { email: recipient, passwordReset: Boolean(credential) },
                                };
                            });
                        }

                        case "register_event": {
                            if (!ticket || !input.eventId || !input.ticketId) {
                                return { status: "failed", code: "TICKET_NOT_FOUND", message: "Ticket not found" };
                            }
                            const { eventId, ticketId } = input;
                            // The worker runs one registration per event at a time, so members of a run cannot
                            // race for the last seats.
                            try {
                                if (freeTicket) {
                                    await handleFreeEventRegistration({ lid, mid, eventId, ticketId });
                                    return { status: "succeeded", message: "Registered" };
                                }
                                if (!paidTicket || !card) {
                                    return { status: "failed", code: "TICKET_UNAVAILABLE", message: "This ticket can't be registered" };
                                }
                                // The handler charges with a new payment key on every call, so mark the member
                                // before it runs. A later attempt that finds the mark does not charge again.
                                const chargeMark = { ...cardDetails, chargeStarted: true };
                                const [marked] = await db.update(memberBulkRunItems)
                                    .set({ details: chargeMark, updated: new Date() })
                                    .where(and(
                                        eq(memberBulkRunItems.id, item.id),
                                        eq(memberBulkRunItems.status, "processing"),
                                        eq(memberBulkRunItems.attempts, attempt),
                                    ))
                                    .returning({ id: memberBulkRunItems.id });
                                if (!marked) return unconfirmedCharge;
                                startedCharge = chargeMark;
                                await handlePaidEventRegistration({
                                    lid,
                                    mid,
                                    eventId,
                                    ticketId,
                                    paymentMethodId: card.id,
                                    paymentType: "card",
                                    attemptId: item.id,
                                });
                                return {
                                    status: "succeeded",
                                    message: `Registered and charged ${cardLabel}`,
                                    details: { ...cardDetails, amount: ticket.price },
                                };
                            } catch (error) {
                                if (!(error instanceof EventRegistrationError)) throw error;
                                // Square raises "not completed" and "not created" after contacting the gateway.
                                if (error.status === 202 || error.code === "PAYMENT_INCOMPLETE" || error.message === "Payment was not created") {
                                    return { status: "needs_review", code: error.code, message: error.message, details: cardDetails };
                                }
                                if (error.status === 409 && error.message.toLowerCase().includes("already registered")) {
                                    return { status: "skipped", code: "ALREADY_REGISTERED", message: "Already registered" };
                                }
                                return { status: "failed", code: error.code, message: error.message, details: cardDetails };
                            }
                        }

                        case "enroll_course": {
                            if (!course) return { status: "failed", code: "COURSE_NOT_FOUND", message: "Course not found" };
                            if (course.status !== "published") {
                                return { status: "failed", code: "COURSE_NOT_PUBLISHED", message: "Course is not published" };
                            }
                            const duplicate = await db.query.courseEnrollments.findFirst({
                                where: and(eq(courseEnrollments.courseId, course.id), eq(courseEnrollments.memberId, mid)),
                                columns: { id: true },
                            });
                            if (duplicate) return { status: "skipped", code: "ALREADY_ENROLLED", message: "Already enrolled" };
                            try {
                                if (course.price <= 0) {
                                    await handleCourseEnrollFree({ lid, mid, courseId: course.id });
                                    return { status: "succeeded", message: "Enrolled" };
                                }
                                if (!card) return { status: "skipped", code: "NO_CARD", message: "No card on file" };
                                // The handler charges with a new payment key on every call, so mark the member
                                // before it runs. A later attempt that finds the mark does not charge again.
                                const chargeMark = { ...cardDetails, chargeStarted: true };
                                const [marked] = await db.update(memberBulkRunItems)
                                    .set({ details: chargeMark, updated: new Date() })
                                    .where(and(
                                        eq(memberBulkRunItems.id, item.id),
                                        eq(memberBulkRunItems.status, "processing"),
                                        eq(memberBulkRunItems.attempts, attempt),
                                    ))
                                    .returning({ id: memberBulkRunItems.id });
                                if (!marked) return unconfirmedCharge;
                                startedCharge = chargeMark;
                                const enrollment = await handleCourseEnrollPaid({
                                    lid,
                                    mid,
                                    courseId: course.id,
                                    paymentMethodId: card.id,
                                    paymentType: "card",
                                    courseTitle: course.title,
                                    coursePrice: course.price,
                                });
                                return {
                                    status: "succeeded",
                                    message: `Enrolled and charged ${cardLabel}`,
                                    details: { ...cardDetails, amount: course.price, transactionId: enrollment.transactionId ?? null },
                                };
                            } catch (error) {
                                if (error instanceof CourseEnrollError) {
                                    if (error.status === 202) {
                                        return { status: "needs_review", code: error.code, message: error.message, details: cardDetails };
                                    }
                                    if (error.status === 409) return { status: "skipped", code: "ALREADY_ENROLLED", message: "Already enrolled" };
                                    return { status: "failed", code: error.code, message: error.message, details: cardDetails };
                                }
                                if (error instanceof PaymentChargeError && (error.code === "PAYMENT_INCOMPLETE" || error.message === "Payment was not created")) {
                                    // Square raises these after the payment exists, so the outcome is unknown.
                                    return { status: "needs_review", code: error.code, message: error.message, details: cardDetails };
                                }
                                if (error instanceof CheckoutError || error instanceof PaymentChargeError) {
                                    return { status: "failed", message: error.message, details: cardDetails };
                                }
                                throw error;
                            }
                        }

                        case "charge": {
                            if (!card || !input.amount || !input.item) {
                                return { status: "failed", code: "INVALID_INPUT", message: "Amount and item are required" };
                            }
                            const checkout = await getCheckoutContext({ lid, mid });
                            // The same member in the same run always maps to the same transaction ID. It is also the
                            // gateway's idempotency key and reference, so it fits Authorize.net's 20-character limit.
                            const transactionId = `txn_${createHash("sha256").update(`bulk-charge:${lid}:${mid}:${item.id}`).digest("hex").slice(0, 16)}`;
                            const description = `${input.item}${input.description ? ` - ${input.description}` : ""}`;
                            const currency = checkout.locationState.currency;
                            const metadata: Record<string, unknown> = {
                                ...(checkout.gateway.service === "authorize" ? { authorizeIntegrationId: checkout.gateway.integrationId } : {}),
                                gatewayService: checkout.gateway.service,
                                checkoutKind: "bulk_charge",
                                bulkRunId: run.id,
                                bulkRunItemId: item.id,
                            };
                            const items = [{ name: input.item, quantity: 1, price: input.amount }];
                            const unconfirmed: ItemOutcome = {
                                ...unconfirmedCharge,
                                details: { ...cardDetails, amount: input.amount, transactionId },
                            };

                            // Record the attempt before contacting the gateway. If this request dies after the gateway
                            // approves, the pending row stops a later retry from charging the member again.
                            const [claimed] = await db.insert(transactions).values({
                                id: transactionId,
                                description,
                                total: input.amount,
                                subTotal: input.amount,
                                tax: 0,
                                type: "inbound",
                                status: "pending",
                                locationId: lid,
                                memberId: mid,
                                paymentMethodId: card.id,
                                paymentType: "card",
                                feeAmount: 0,
                                items,
                                currency,
                                metadata,
                            }).onConflictDoNothing({ target: transactions.id }).returning({ id: transactions.id });
                            if (!claimed) {
                                const existing = await db.query.transactions.findFirst({
                                    where: eq(transactions.id, transactionId),
                                    columns: { status: true, failedReason: true },
                                });
                                if (existing?.status === "paid") {
                                    return { status: "succeeded", message: `Charged ${cardLabel}`, details: { ...cardDetails, amount: input.amount, transactionId } };
                                }
                                if (existing?.status === "failed") {
                                    return { status: "failed", message: existing.failedReason ?? "Payment failed", details: { ...cardDetails, transactionId } };
                                }
                                return unconfirmed;
                            }

                            let charge: ChargeWithGatewayResult;
                            try {
                                charge = await chargeWithGateway({
                                    gateway: checkout.gateway,
                                    gatewayCustomerId: checkout.gatewayCustomerId,
                                    paymentMethodId: card.id,
                                    transactionId,
                                    paymentType: "card",
                                    total: input.amount,
                                    feesAmount: 0,
                                    currency,
                                    description,
                                    note: `bulkRunId:${run.id}|mid:${mid}|lid:${lid}`,
                                    metadata: { locationId: lid, memberId: mid, transactionId, bulkRunId: run.id },
                                }).catch((error) => {
                                    // Only explicit declines enter the failure branch. Other errors keep their behavior.
                                    const failure = paymentFailureFromError(error);
                                    if (!failure) throw error;
                                    return failure;
                                });
                            } catch (error) {
                                // Square raises these after the payment exists, so the outcome is unknown.
                                const reachedGateway = !(error instanceof PaymentChargeError)
                                    || error.code === "PAYMENT_INCOMPLETE"
                                    || error.message === "Payment was not created";
                                if (reachedGateway) {
                                    console.error("[Bulk Runs] Charge outcome unknown", { itemId, transactionId, error });
                                    return unconfirmed;
                                }
                                // Rejected before contacting the gateway, so nothing was charged.
                                await db.update(transactions)
                                    .set({ status: "failed", failedReason: error.message, failedCode: error.code ?? null, updated: new Date() })
                                    .where(and(eq(transactions.id, transactionId), eq(transactions.status, "pending")));
                                return { status: "failed", code: error.code, message: error.message, details: { ...cardDetails, transactionId } };
                            }

                            const now = new Date();
                            if (charge.status === "approved") {
                                await db.update(transactions)
                                    .set({
                                        status: "paid",
                                        chargeDate: now,
                                        paymentIntentId: charge.paymentIntentId,
                                        metadata: { ...metadata, ...charge.gatewayMetadata },
                                        activities: [{
                                            at: now.toISOString(),
                                            reason: "Payment succeeded",
                                            paymentType: charge.paymentType ?? "card",
                                            brand: charge.brand,
                                            last4: charge.last4,
                                        }],
                                        updated: now,
                                    })
                                    .where(and(eq(transactions.id, transactionId), eq(transactions.status, "pending")));
                                return {
                                    status: "succeeded",
                                    message: `Charged ${cardLabel}`,
                                    details: { ...cardDetails, amount: input.amount, transactionId },
                                };
                            }
                            if (charge.status === "failed") {
                                await db.transaction(async (tx) => {
                                    const [updated] = await tx.update(transactions)
                                        .set({
                                            status: "failed",
                                            chargeDate: now,
                                            paymentIntentId: charge.paymentIntentId,
                                            failedReason: charge.failureReason,
                                            failedCode: charge.failureCode,
                                            metadata: { ...metadata, ...charge.gatewayMetadata },
                                            activities: [{
                                                at: now.toISOString(),
                                                reason: `Payment failed: ${charge.failureReason}`,
                                                paymentType: charge.paymentType ?? "card",
                                                brand: charge.brand,
                                                last4: charge.last4,
                                            }],
                                            updated: now,
                                        })
                                        .where(and(eq(transactions.id, transactionId), eq(transactions.status, "pending")))
                                        .returning({ id: transactions.id });
                                    // Held/configuration failures keep their billing status, but do not start workflows.
                                    if (updated && isPaymentDecline(
                                        charge.gatewayMetadata.gatewayService,
                                        charge.failureCode,
                                        charge.gatewayMetadata.squarePaymentStatus,
                                        charge.gatewayMetadata.authorizeResponseCode,
                                    )) {
                                        await dispatchPaymentFailed(tx, updated.id);
                                    }
                                });
                                return {
                                    status: "failed",
                                    code: charge.failureCode,
                                    message: charge.failureReason,
                                    details: { ...cardDetails, transactionId },
                                };
                            }
                            // The gateway did not confirm either way; the transaction stays pending for staff to check.
                            return unconfirmed;
                        }

                        default: {
                            const exhaustive: never = run.action;
                            throw new Error(`Unknown bulk action: ${exhaustive}`);
                        }
                    }
                })();
            }
        } catch (error) {
            if (startedCharge) {
                // The checkout handler may have charged the card before it failed, so do not retry it.
                console.error("[Bulk Runs] Charge outcome unknown", { itemId, action: run.action, error });
                outcome = { ...unconfirmedCharge, details: startedCharge };
            } else if (error instanceof PaymentChargeError) {
                outcome = { status: "failed", code: error.code, message: error.message };
            } else {
                console.error("[Bulk Runs] Member action failed", { itemId, action: run.action, error });
                return status(500, { error: "Bulk action failed; the worker will retry this member" });
            }
        }

        const now = new Date();
        await db.update(memberBulkRunItems)
            .set({
                status: outcome.status,
                code: outcome.code ?? null,
                message: outcome.message,
                details: outcome.details ?? {},
                leaseUntil: null,
                finished: now,
                updated: now,
            })
            .where(and(
                eq(memberBulkRunItems.id, item.id),
                eq(memberBulkRunItems.status, "processing"),
                eq(memberBulkRunItems.attempts, attempt),
            ));

        return outcome;
    });
