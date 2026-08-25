import { db } from "@/db/db";
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

function subLabel(sub: {
    pricing?: { name: string; price: number; plan?: { name: string } | null } | null;
}) {
    const name = sub.pricing?.plan?.name || sub.pricing?.name || "Subscription";
    const amount = ((sub.pricing?.price || 0) / 100).toFixed(2);
    return `${name} · ${amount} · unpaid`;
}

async function retryUnpaidSubscription(lid: string, mid: string, sid: string) {
    const sub = await db.query.memberSubscriptions.findFirst({
        where: (s, { and, eq }) => and(
            eq(s.id, sid),
            eq(s.status, "unpaid"),
        ),
        columns: { id: true, cancelAt: true },
    });
    if (!sub) return null;
    if (sub.cancelAt && sub.cancelAt.getTime() <= Date.now()) {
        return {
            content: jsonResult({
                ok: false,
                error: "This subscription is canceled and cannot be retried.",
                ui: actionCard("error", "This subscription is canceled and cannot be retried."),
            }),
        };
    }

    const failedInvoice = await db.query.memberInvoices.findFirst({
        where: (i, { and, eq }) => and(
            eq(i.locationId, lid),
            eq(i.memberId, mid),
            eq(i.memberPlanId, sid),
            eq(i.status, "unpaid"),
        ),
        columns: { id: true, transactionId: true },

    })

    if (!failedInvoice) {
        return {
            content: jsonResult({
                ok: false,
                error: "No unpaid invoice found for this subscription.",
                ui: actionCard("error", "No unpaid invoice found for this subscription."),
            }),
        };
    }



    return {
        content: jsonResult({
            ok: true,
            status: "retried",
            subscriptionId: sub.id,
            memberId: mid,
            transactionId: failedInvoice.id,
            ui: actionCard("success", "Done. Payment retry was submitted."),
        }),
    };
}

export async function executeRetryFailed(args: ToolArgs, lid: string): Promise<ToolExecutorResult> {
    const { memberId: mid, name } = memberFromArgs(args);
    const sid = argString(args, "subscriptionId", "sid");

    if (sid && mid) {
        const retried = await retryUnpaidSubscription(lid, mid, sid);
        if (retried) return retried;
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
