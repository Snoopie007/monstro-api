import type { ToolArgs, ToolExecutorResult } from "../type";

export function executeReportTool(input: unknown, locationId: string): ToolExecutorResult {
  return {
    content: "Report tool executed",
  };
} 