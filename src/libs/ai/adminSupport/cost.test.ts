import { describe, expect, test } from "bun:test";
import {
  calculateAiCostMicrousd,
  calculateResponsesCostMicrousd,
} from "./cost";

const usage = {
  input_tokens: 2_000,
  input_tokens_details: { cached_tokens: 1_000 },
  output_tokens: 500,
};

function response(extraOutput: unknown[] = []) {
  return {
    status: "completed",
    usage,
    output: [
      ...extraOutput,
      ...Array.from({ length: 3 }, () => ({
        type: "web_search_call",
        status: "completed",
        action: { type: "search", query: "support" },
      })),
    ],
  };
}

describe("admin support AI cost", () => {
  test("prices Luna Responses usage", () => {
    expect(calculateAiCostMicrousd("gpt-5.6-luna", usage)).toBe(4_100);
    expect(
      calculateAiCostMicrousd("gpt-5.6-luna", {
        input_tokens: 2_000,
        input_token_details: { cache_read: 1_000 },
        output_tokens: 500,
      }),
    ).toBe(4_100);
  });

  test("keeps pricing configured model overrides", () => {
    expect(calculateAiCostMicrousd("gpt-5.5", usage)).toBe(20_500);
  });

  test("adds completed search fees and ignores other actions", () => {
    expect(
      calculateResponsesCostMicrousd(
        "gpt-5.6-luna",
        response([
          {
            type: "web_search_call",
            status: "completed",
            action: { type: "open_page" },
          },
          {
            type: "web_search_call",
            status: "in_progress",
            action: { type: "search" },
          },
        ]),
      ),
    ).toBe(34_100);
  });

  test("does not price incomplete or unknown usage", () => {
    expect(
      calculateResponsesCostMicrousd("gpt-5.5", {
        ...response(),
        status: "in_progress",
      }),
    ).toBe(0);
    expect(calculateResponsesCostMicrousd("gpt-5.4", response())).toBeNull();
    expect(
      calculateResponsesCostMicrousd("gpt-5.6-luna", { status: "completed" }),
    ).toBeNull();
  });
});
