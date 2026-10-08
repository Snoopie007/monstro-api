import type { ToolArgs, ToolExecutorResult } from "../type";
import { asString, pauseClarify } from "../utils";

function normalizeClarifyOption(option: unknown): { id: string; label: string } | null {
    if (typeof option === "string") {
        const label = option.trim();
        return label ? { id: label, label } : null;
    }
    if (typeof option !== "object" || option === null) return null;

    const record = option as { id?: unknown; label?: unknown; value?: unknown; name?: unknown };
    const label = asString(record.label) || asString(record.name) || asString(record.value);
    const id = asString(record.id) || asString(record.value) || label;
    return id && label ? { id, label } : null;
}

export async function executeClarify(args: ToolArgs): Promise<ToolExecutorResult> {
    const options = Array.isArray(args.options)
        ? args.options
            .map(normalizeClarifyOption)
            .filter((option): option is { id: string; label: string } => !!option)
        : [];

    return pauseClarify(asString(args.question) || "Can you clarify your request?", options);
}
