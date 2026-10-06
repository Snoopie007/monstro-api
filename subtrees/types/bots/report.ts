export type ReportKind = "active_members" | "monthly_revenue" | "mrr" | "top_payers";

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

export type MRRReport = ReportBase & {
	kind: "average_mrr";
	block: MetricBlock & { unit: "cents" };
	activeSubscriptions: number;
	totalMrrCents: number;
	averageMrrCents: number;
};

export type ReportToolResult =
	| ActiveMembersReport
	| MonthlyRevenueReport
	| MRRReport
	| TopPayersReport
	| { ok: false; error: string };
