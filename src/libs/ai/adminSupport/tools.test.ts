import { describe, expect, test } from "bun:test";
import { parseResponsesOutput } from "./tools";

const citation = {
  type: "url_citation",
  url: "https://help.gohighlevel.com/support/solutions/articles/123",
  title: "Support article",
};

function responsesPayload(
  usage: unknown = {
    input_tokens: 2_000,
    input_tokens_details: { cached_tokens: 1_000 },
    output_tokens: 500,
  },
  extraSearchCalls: unknown[] = [],
) {
  return {
    usage,
    output: [
      {
        type: "output_text",
        text: "Answer",
        annotations: [citation],
      },
      ...extraSearchCalls,
      ...Array.from({ length: 3 }, () => ({
        type: "web_search_call",
        status: "completed",
        action: { type: "search", query: "support" },
      })),
    ],
  };
}

describe("admin support Responses parser", () => {

  test("prices raw Responses usage and ignores non-search or incomplete actions", () => {
    const result = parseResponsesOutput(
      responsesPayload(undefined, [
        {
          type: "web_search_call",
          status: "completed",
          action: { type: "open_page" },
        },
        {
          type: "web_search_call",
          status: "in_progress",
          action: { type: "search", query: "support" },
        },
      ]),
      "gpt-5.5",
    );

    expect(result).toEqual(expect.objectContaining({ kind: "reply", aiCostMicrousd: 50_500 }));
  });


  test("keeps a completed call cost on the deterministic unavailable fallback", () => {
    const result = parseResponsesOutput(
      {
        usage: {
          input_tokens: 2_000,
          input_tokens_details: { cached_tokens: 1_000 },
          output_tokens: 500,
        },
        output: [],
      },
      "gpt-5.5",
    );

    expect(result).toEqual({ kind: "unavailable", aiCostMicrousd: 20_500 });
  });

});
