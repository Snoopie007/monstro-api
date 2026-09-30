import type { botMessages, bots } from "../schemas/bots";
import type { Location } from "./location";
import type { User } from "./user";

type BotSSEPayloads = {
	start: { ts?: number; message?: string; locationId?: string; threadId?: string };
	status: { text?: string };
	tool_start: { id?: string; name?: string };
	clarify: { id?: string; question?: string; options?: BotClarifyOption[] };
	ask: { id?: string; question?: string };
	awaiting_input: { ts?: number; threadId?: string };
	tool_result: { id?: string; name?: string; result?: unknown };
	text_delta: { delta?: string; text?: string; index?: number; ts?: number };
	reply: { text?: string };
	done: { ts?: number; threadId?: string };
	error: { message?: string };
};

export type BOTSSEEvent = {
	[K in keyof BotSSEPayloads]: { event: K; data: BotSSEPayloads[K] };
}[keyof BotSSEPayloads];



export type SessionBookedToolArgs = {
	memberId: string;
	memberName?: string;
	sessionId: string;
	reservationId?: string;
	lid?: string;
};



export type ToolPayload = {
	ok?: boolean
	status?: string
	kind?: string
	question?: string
	tool?: string
	args?: Record<string, unknown>
};

export type BotClarifyOption = {
	id: string
	label: string
}

export type BotClarify = {
	id: string
	question: string
	options: BotClarifyOption[]
}

export type SessionAction = "session-booked" | "session-cancelled";


/** Tool result the agent attaches when a session was booked or cancelled. */
export type BotActionUI = {
	action: SessionAction;
	message: string;
	args: Record<string, unknown>;
};

export type BotToolResult = {
	ui: BotActionUI;
};

export type BotToolCard = {
	id: string;
	action: SessionAction;
	message: string;
	args: Record<string, unknown>;
};

export type ReportKind = "active_members" | "monthly_revenue" | "average_mrr" | "top_payers";

/** Phrase the model passes, such as "this month", "last 6 months", or "this year". */
export type ReportToolArgs = {
	kind: ReportKind;
	range?: string;
};

export type ReportWindow = {
	label: string;
	start: string;
	end: string;
	bucket: "day" | "month";
};

export type MetricBlock = {
	type: "metric";
	label: string;
	value: number;
	unit: "count" | "cents";
};

export type RevenueChartBlock = {
	type: "chart";
	label: string;
	unit: "cents";
	totalCents: number;
	points: Array<{ date: string; totalCents: number }>;
};

export type TopPayerRow = {
	memberId: string;
	name: string;
	totalCents: number;
};

export type ListBlock = {
	type: "list";
	label: string;
	rows: TopPayerRow[];
};

type ReportBase = {
	ok: true;
	summary: string;
};

export type ActiveMembersReport = ReportBase & {
	kind: "active_members";
	block: MetricBlock & { unit: "count" };
	activeMemberCount: number;
	activeSubscriptions: number;
	activePackages: number;
};

export type MonthlyRevenueReport = ReportBase & {
	kind: "monthly_revenue";
	range: ReportWindow;
	block: RevenueChartBlock;
};

export type TopPayersReport = ReportBase & {
	kind: "top_payers";
	range: ReportWindow;
	block: ListBlock;
};

export type AverageMrrReport = ReportBase & {
	kind: "average_mrr";
	block: MetricBlock & { unit: "cents" };
	activeSubscriptions: number;
	totalMrrCents: number;
	averageMrrCents: number;
};

export type ReportToolResult =
	| ActiveMembersReport
	| MonthlyRevenueReport
	| AverageMrrReport
	| TopPayersReport
	| { ok: false; error: string };

export type BotRole = "vendor" | "staff";
export type BotMessageRole =
	| "human"
	| "ai"
	| "staff"
	| "system"
	| "tool"
	| "tool_message"
	| "tool_call";

export type Bot = typeof bots.$inferSelect & {
	user?: User;
	location?: Location;
	messages?: BotMessage[];
};

export type BotMessage = typeof botMessages.$inferSelect & {
	bot?: Bot;
};

export type NewBot = typeof bots.$inferInsert;
export type NewBotMessage = typeof botMessages.$inferInsert;
