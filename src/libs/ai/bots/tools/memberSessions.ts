import { db } from "@/db/db";
import { planPrograms } from "@/subtrees/schemas";
import type { MemberSessionsResult } from "@/subtrees/types/bots";
import { inArray } from "drizzle-orm";
import type { ToolArgs, ToolExecutorResult } from "../type";
import {
    findMemberByName,
    jsonResult,
    memberFromArgs,
    memberLabel,
    pauseAsk,
    pauseClarify,
} from "../utils";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function dayLabel(day: number) {
    return DAY_LABELS[((day % 7) + 7) % 7] ?? "Unknown";
}

function clockLabel(time: string) {
    const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
    const hour = hours ?? 0;
    const suffix = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${String(minutes ?? 0).padStart(2, "0")} ${suffix}`;
}

function sessionResult(result: MemberSessionsResult | { ok: false; error: string }): ToolExecutorResult {
    return { content: jsonResult(result as unknown as Record<string, unknown>) };
}

export async function executeMemberSessions(args: ToolArgs, lid: string): Promise<ToolExecutorResult> {
    const { memberId: givenId, name } = memberFromArgs(args);
    let memberId = givenId;
    let memberName = name;

    if (!memberId) {
        if (!name) return pauseAsk("What is the member's first and last name?");
        const matches = await findMemberByName(lid, name);
        if (matches.length === 0) {
            return sessionResult({ ok: false, error: "No member found." });
        }
        if (matches.length > 1) {
            return pauseClarify(
                "Which member?",
                matches.map((item) => ({
                    id: item.id,
                    label: [memberLabel(item), item.email].filter(Boolean).join(" · "),
                })),
            );
        }
        const match = matches[0]!;
        memberId = match.id;
        memberName = memberLabel(match);
    }

    const [subs, pkgs] = await Promise.all([
        db.query.memberSubscriptions.findMany({
            where: (row, { and: andWhere, eq: eqCol }) => andWhere(
                eqCol(row.memberId, memberId),
                eqCol(row.locationId, lid),
                eqCol(row.status, "active"),
            ),
            columns: { memberPlanPricingId: true },
            with: {
                pricing: {
                    columns: { memberPlanId: true },
                    with: { plan: { columns: { id: true, name: true } } },
                },
            },
        }),
        db.query.memberPackages.findMany({
            where: (row, { and: andWhere, eq: eqCol }) => andWhere(
                eqCol(row.memberId, memberId),
                eqCol(row.locationId, lid),
                eqCol(row.status, "active"),
            ),
            columns: { memberPlanPricingId: true },
            with: {
                pricing: {
                    columns: { memberPlanId: true },
                    with: { plan: { columns: { id: true, name: true } } },
                },
            },
        }),
    ]);

    const planNamesById = new Map<string, string>();
    for (const row of [...subs, ...pkgs]) {
        const plan = row.pricing?.plan;
        if (plan?.id) planNamesById.set(plan.id, plan.name);
    }

    const planIds = [...planNamesById.keys()];
    const links = planIds.length === 0 ? [] : await db.query.planPrograms.findMany({
        where: inArray(planPrograms.planId, planIds),
        columns: { planId: true, programId: true },
        with: {
            program: {
                columns: { id: true, name: true, status: true, locationId: true },
                with: {
                    sessions: {
                        columns: { id: true, day: true, time: true, duration: true, canceled: true },
                    },
                },
            },
        },
    });

    const programs = new Map<string, {
        programId: string;
        name: string;
        planNames: Set<string>;
        sessions: Map<string, { id: string; day: number; time: string; duration: number }>;
    }>();

    for (const link of links) {
        const program = link.program;
        if (!program || program.locationId !== lid || program.status !== "active") continue;
        const group = programs.get(program.id) ?? {
            programId: program.id,
            name: program.name,
            planNames: new Set<string>(),
            sessions: new Map(),
        };
        const planName = planNamesById.get(link.planId);
        if (planName) group.planNames.add(planName);
        for (const session of program.sessions) {
            if (session.canceled) continue;
            group.sessions.set(session.id, {
                id: session.id,
                day: session.day,
                time: String(session.time).slice(0, 5),
                duration: session.duration,
            });
        }
        programs.set(program.id, group);
    }

    const programRows = [...programs.values()]
        .map((program) => ({
            programId: program.programId,
            name: program.name,
            planNames: [...program.planNames],
            sessions: [...program.sessions.values()]
                .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))
                .map((session) => ({
                    ...session,
                    dayLabel: dayLabel(session.day),
                })),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

    const label = memberName || "Member";
    const summary = programRows.length === 0
        ? `${label} has no classes on an active plan at this location.`
        : `${label} has ${programRows.map((program) => {
            const times = program.sessions.map((session) => `${session.dayLabel} ${clockLabel(session.time)}`).join(", ");
            return times ? `${program.name} (${times})` : program.name;
        }).join("; ")}.`;

    return sessionResult({
        ok: true,
        memberId,
        name: label,
        summary,
        block: {
            type: "list",
            label,
            programs: programRows,
        },
    });
}
