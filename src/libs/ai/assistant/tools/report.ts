import type { ToolExecutorContext, ToolExecutorResult } from "./shared";

type ReportDeps = {
  parseRangeDays: (input?: string) => number;
  fetchReportWithChart: (locationId: string, metric: string, rangeDays: number) => Promise<{
    metric: string;
    rangeDays: number;
    current: number;
    previous: number;
    direction: "up" | "down" | "flat";
    changePercent: number;
    chartBlock?: unknown;
  }>;
};

export async function executeReportTool(params: {
  input: Record<string, unknown>;
  context: ToolExecutorContext;
  deps: ReportDeps;
}): Promise<ToolExecutorResult> {
  const { input, context, deps } = params;
  const { parseRangeDays, fetchReportWithChart } = deps;
  const metric = typeof input.metric === "string" ? input.metric : "active_members";
  const rangeText = typeof input.range === "string" ? input.range : "last 30 days";
  const rangeDays = parseRangeDays(rangeText);
  const report = await fetchReportWithChart(context.locationId, metric, rangeDays);

  return {
    content: JSON.stringify({
      ok: true,
      locationId: context.locationId,
      tool: "location_reports",
      metric: report.metric,
      rangeDays: report.rangeDays,
      current: report.current,
      previous: report.previous,
      trend: report.direction,
      changePercent: report.changePercent,
      chartBlock: report.chartBlock,
    }),
  };

}
