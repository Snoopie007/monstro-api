import { db } from "@/db/db";
import { retrySubscriptionPayment, type RetryPaymentErrorCode } from "@/handlers/subscription/retryPayment";
import type { ToolArgs, ToolExecutorResult } from "../type";
import {
    argString,
    actionCard,
    findMemberByName,
    jsonResult,
    memberFromArgs,
    memberLabel,
    pauseAsk,
    pauseClarify,
} from "../utils";

const retryToolMessage: Record<RetryPaymentErrorCode, string> = {
    SUBSCRIPTION_NOT_FOUND: "We couldn't retry that subscription.",
    SUBSCRIPTION_CANCELED: "This subscription is canceled and cannot be retried.",
    NO_PAYMENT_METHOD: "This subscription has no card on file.",
    INVOICE_NOT_FOUND: "No unpaid invoice found for this subscription.",
    TRANSACTION_NOT_FOUND: "No unpaid invoice found for this subscription.",
    LOCATION_INACTIVE: "This location isn't accepting payments right now.",
    CHARGE_FAILED: "Payment retry failed.",
};

function subLabel(sub: {
    pricing?: { name: string; price: number; plan?: { name: string } | null } | null;
}) {
    const name = sub.pricing?.plan?.name || sub.pricing?.name || "Subscription";
    const amount = ((sub.pricing?.price || 0) / 100).toFixed(2);
    return `${name} · ${amount} · unpaid`;
}

function retryError(code: RetryPaymentErrorCode, fallback: string): ToolExecutorResult {
    const message = code === "CHARGE_FAILED" ? fallback : retryToolMessage[code];
    return {
        content: jsonResult({
            ok: false,
            error: message,
            ui: actionCard("error", message),
        }),
    };
}

export async function executeRetryFailed(args: ToolArgs, lid: string): Promise<ToolExecutorResult> {
    const { memberId: mid, name } = memberFromArgs(args);
    const sid = argString(args, "subscriptionId", "sid");

    if (sid && mid) {
        try {
            const result = await retrySubscriptionPayment({ lid, memberPlanId: sid });
            if (!result.ok) return retryError(result.code, result.message);
            return {
                content: jsonResult({
                    ok: true,
                    status: "retried",
                    subscriptionId: result.subscriptionId,
                    memberId: mid,
                    transactionId: result.transactionId,
                    ui: actionCard("success", "Done. Payment retry was submitted."),
                }),
            };
        } catch (error) {
            console.error(error);
            return retryError("CHARGE_FAILED", "Payment retry failed.");
        }
    }

    if (!mid) {
        if (!name) return pauseAsk("What is the member's first and last name?");

        const matches = await findMemberByName(lid, name);
        if (matches.length === 0) {
            return {
                content: jsonResult({
                    ok: false,
                    error: "We cannot find this member.",
                    ui: actionCard("error", "We cannot find this member."),
                }),
            };
        }
        return pauseClarify(
            matches.length === 1 ? "Is this the right member?" : "Which member did you mean?",
            matches.map((item) => ({
                id: item.id,
                label: [memberLabel(item), item.email].filter(Boolean).join(" · "),
            })),
        );
    }

    const unpaid = await db.query.memberSubscriptions.findMany({
        where: (s, { and, eq, or }) => and(
            eq(s.memberId, mid),
            eq(s.locationId, lid),
            or(
                eq(s.status, "unpaid"),
                eq(s.status, "past_due"),
            ),
        ),
        columns: { id: true },
        with: {
            pricing: {
                columns: { name: true, price: true },
                with: {
                    plan: { columns: { name: true } },
                },
            },
        },
        limit: 8,
    });

    if (unpaid.length === 0) {
        return {
            content: jsonResult({
                ok: false,
                error: "This member has no unpaid subscriptions.",
                ui: actionCard("error", "This member has no unpaid subscriptions."),
            }),
        };
    }

    return pauseClarify(
        unpaid.length === 1
            ? `Retry payment for ${subLabel(unpaid[0]!)}?`
            : "Which unpaid subscription should I retry?",
        unpaid.map((item) => ({
            id: item.id,
            label: unpaid.length === 1 ? "Yes, retry payment" : subLabel(item),
        })),
    );
}
