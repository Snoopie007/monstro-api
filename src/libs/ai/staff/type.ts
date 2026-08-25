
export type Send = (event: string, data: unknown) => void;
export type ToolArgs = Record<string, unknown>;
export type AgentMention = {
    id: string;
    label: string;
};
export type PausedTask = {
    name: string;
    args: ToolArgs;
    kind: string;
    question: string;
    options: Array<{ id: string; label: string }>;
};
export type ToolExecutorResult = {
    content: string;
    pause?: true;
    ask?: { question: string };
    clarify?: { question: string; options: Array<{ id: string; label: string }> };
};
export type AgentActionCardUi = {
    type: "action_card";
    variant: "success" | "error" | "info";
    message: string;
    action?: string;
    args?: ToolArgs;
};
export type MemberMatch = {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string;
    phone: string | null;
};