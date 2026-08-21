import { db } from "@/db/db";
import type { BaseMessage } from "@langchain/core/messages";
import type { AgentActionCardUi, AgentMention, MemberMatch, PausedTask, ToolArgs, ToolExecutorResult } from "./type";

export function parseToolArgs(input: unknown): ToolArgs {
    if (typeof input === "string") {
        try {
            const parsed = JSON.parse(input);
            return typeof parsed === "object" && parsed !== null ? parsed as ToolArgs : {};
        } catch {
            return {};
        }
    }
    return typeof input === "object" && input !== null ? input as ToolArgs : {};
}

export function jsonResult(data: Record<string, unknown>) {
    return JSON.stringify(data);
}

export function actionCard(
    variant: AgentActionCardUi["variant"],
    message: string,
    action?: string,
    args?: ToolArgs,
): AgentActionCardUi {
    return {
        type: "action_card",
        variant,
        message,
        ...(action ? { action } : {}),
        ...(args ? { args } : {}),
    };
}

export function memberLabel(member: Pick<MemberMatch, "firstName" | "lastName">) {
    return [member.firstName, member.lastName].filter(Boolean).join(" ");
}

export function pauseAsk(question: string): ToolExecutorResult {
    return {
        pause: true as const,
        ask: { question },
        content: jsonResult({ ok: true, status: "awaiting_input", kind: "ask", question }),
    };
}

export function asString(value: unknown): string {
    if (typeof value === "string") return value.trim();
    return "";
}

export function argString(args: ToolArgs, ...keys: string[]) {
    for (const key of keys) {
        const value = asString(args[key]);
        if (value) return value;
    }
    return "";
}

export function memberFromArgs(args: ToolArgs) {
    const name = argString(args, "name");
    const memberId = argString(args, "memberId", "mid");
    if (memberId) return { memberId, name: name.startsWith("mbr_") ? "" : name };
    if (name.startsWith("mbr_")) return { memberId: name, name: "" };
    return { memberId: "", name };
}

export function applyMentions(args: ToolArgs, mentions: AgentMention[]): ToolArgs {
    const resolved = mentions
        .map((mention) => ({ id: asString(mention.id), label: asString(mention.label) }))
        .filter((mention) => mention.id.startsWith("mbr_") && mention.label);
    if (resolved.length === 0) return args;

    const next = { ...args };
    const currentId = argString(next, "memberId", "mid") || argString(next, "name");
    const mention = resolved.find((item) => item.id === currentId) || resolved[0]!;
    next.memberId = mention.id;
    next.name = mention.label;
    return next;
}

export function normalizeToolArgs(args: ToolArgs): ToolArgs {
    const memberId = argString(args, "memberId", "mid");
    const subscriptionId = argString(args, "subscriptionId", "sid");
    const reservationId = argString(args, "reservationId", "rid");
    const memberPlanId = argString(args, "memberPlanId");
    const next = { ...args };
    if (memberId) next.memberId = memberId;
    if (subscriptionId) next.subscriptionId = subscriptionId;
    if (reservationId) next.reservationId = reservationId;
    if (memberPlanId) next.memberPlanId = memberPlanId.startsWith("plan:") ? memberPlanId.slice(5) : memberPlanId;
    return next;
}

export function compactArgs(args: ToolArgs): ToolArgs {
    return Object.fromEntries(
        Object.entries(args).filter(([, value]) => value !== "" && value != null),
    );
}

function parseJsonObject(content: string) {
    try {
        const parsed = JSON.parse(content) as Record<string, unknown>;
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
        return null;
    }
}

const TASK_TOOLS = new Set(["retry_failed", "cancel_session", "schedule_session"]);

export function lastPausedTask(stored: BaseMessage[]): PausedTask | null {
    const last = stored.at(-1);
    if (!last) return null;
    const payload = parseJsonObject(typeof last.content === "string" ? last.content : "");
    if (!payload || payload.status !== "awaiting_input") return null;

    const name = asString(payload.tool);
    if (!TASK_TOOLS.has(name)) return null;

    const args = payload.args && typeof payload.args === "object" ? payload.args as ToolArgs : {};
    const options = Array.isArray(payload.options)
        ? payload.options.filter((option): option is { id: string; label: string } => (
            !!option
            && typeof option === "object"
            && typeof (option as { id?: unknown }).id === "string"
            && typeof (option as { label?: unknown }).label === "string"
        ))
        : [];

    return {
        name,
        args,
        kind: asString(payload.kind),
        question: asString(payload.question),
        options,
    };
}

export function mergeResumeArgs(paused: PausedTask, message: string): ToolArgs {
    const next = { ...paused.args };
    const text = message.trim();
    if (!text) return next;

    const picked = paused.options.find((option) => (
        option.id === text || option.label.toLowerCase() === text.toLowerCase()
    ));
    const mentionedId = text.match(/\bmbr_[A-Za-z0-9]+\b/)?.[0] || "";
    const id = picked?.id || mentionedId || text;
    const chipName = picked?.label ? picked.label.split(" · ")[0]!.trim() : "";

    if (id.startsWith("mbr_")) {
        next.memberId = id;
        if (chipName) next.name = chipName;
        return next;
    }
    if (picked && /\bmember\b/i.test(paused.question)) {
        next.memberId = picked.id;
        if (chipName) next.name = chipName;
        return next;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(id)) {
        next.date = id;
        return next;
    }
    if (/^(today|tomorrow)$/i.test(id)) {
        next.date = id.toLowerCase();
        return next;
    }
    if (id.startsWith("refund:") || id.startsWith("keep:")) {
        next.reservationId = id;
        return next;
    }
    if (id.startsWith("plan:")) {
        next.memberPlanId = id.slice(5);
        return next;
    }
    if (paused.kind === "ask" || (paused.options.length === 0 && /\s/.test(text) && !text.includes("·"))) {
        if (paused.name === "schedule_session" && argString(next, "memberId", "mid")) {
            if (/\btime\b/i.test(paused.question)) {
                next.time = text;
            } else {
                next.program = text;
                delete next.programId;
            }
            return next;
        }
        if (argString(next, "memberId", "mid") && !asString(next.program) && !asString(next.programId)) {
            next.program = text;
        } else {
            next.name = text;
        }
        return next;
    }
    if (paused.name === "retry_failed") next.subscriptionId = id;
    else if (paused.name === "cancel_session") next.reservationId = id;
    else if (paused.name === "schedule_session") {
        if (argString(next, "memberId", "mid") && !asString(next.programId)) next.programId = id;
        else next.sessionId = id;
    }
    return next;
}

export function pauseClarify(question: string, options: Array<{ id: string; label: string }>): ToolExecutorResult {
    if (options.length === 0) return pauseAsk(question);
    return {
        pause: true as const,
        clarify: { question, options },
        content: jsonResult({ ok: true, status: "awaiting_input", kind: "clarify", question, options }),
    };
}

export async function findMemberByName(locationId: string, name: string): Promise<MemberMatch[]> {
    const [firstName, ...rest] = name.split(/\s+/);
    const lastName = rest.join(" ");
    if (!firstName || !lastName) return [];

    const members = await db.query.members.findMany({
        where: (m, { and, ilike }) => and(
            ilike(m.firstName, firstName),
            ilike(m.lastName, lastName),
        ),
        columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
        },
        with: {
            memberLocations: {
                where: (ml, { eq }) => eq(ml.locationId, locationId),
                columns: { locationId: true },
            },
        },
        limit: 8,
    });

    const matches = members.filter((member) =>
        member.memberLocations.length > 0
    );

    return matches.map((member) => ({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
    }));
}