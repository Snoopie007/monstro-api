import type { Location } from "@subtrees/types";
import type { Member, MemberPlanPricing } from "@subtrees/types";

export function formatContractInterval(
    interval: string | null,
    intervalThreshold: number | null,
): string {
    if (interval === "month") {
        return `${intervalThreshold ?? 1} months`;
    }
    if (interval === "year") {
        return `${intervalThreshold ?? 1} years`;
    }
    if (interval === "week") {
        return `${intervalThreshold ?? 1} weeks`;
    }
    if (interval === "day") {
        return `${intervalThreshold ?? 1} days`;
    }
    return "";
}

export function buildContractVariables(input: {
    location?: Location | null;
    member?: Member | null;
    pricing?: MemberPlanPricing | null;
}): Record<string, unknown> {
    const { location, member, pricing } = input;

    const variables: Record<string, unknown> = {
        location,
        member: member
            ? {
                ...member,
                name: `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim(),
            }
            : undefined,
    };

    if (pricing) {
        const plan = pricing.plan;
        variables.plan = {
            name: plan?.name,
            price: pricing.price,
            pricingName: pricing.name,
            interval: formatContractInterval(pricing.interval, pricing.intervalThreshold),
            limit: plan?.totalClassLimit,
            familyLimit: plan?.familyMemberLimit,
        };
    }

    return variables;
}

export function renderContractContent(
    templateContent: string | null | undefined,
    input: {
        location?: Location | null;
        member?: Member | null;
        pricing?: MemberPlanPricing | null;
    },
): string {
    const variables = buildContractVariables(input);
    return interpolateContract(templateContent ?? "", variables);
}

export function interpolateContract(template: string, variables: Record<string, unknown>): string {
    if (!template) return "";

    return template.replace(
        /\{\{([a-zA-Z0-9_.]+)\}\}/g,
        (match, path: string) => {
            const value = path.split(".").reduce<unknown>((obj, key) => {
                if (obj && typeof obj === "object" && key in (obj as Record<string, unknown>)) {
                    return (obj as Record<string, unknown>)[key];
                }
                return undefined;
            }, variables);
            return value !== undefined && value !== null ? String(value) : match;
        },
    );
}
