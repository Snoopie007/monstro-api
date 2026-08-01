import { afterEach, describe, expect, test } from "bun:test";
import { calculateAICost, getModelName } from "./AI";
import { getOpenAIModelKwargs } from "./models";

const originalSupportBotModel = process.env.SUPPORT_BOT_MODEL;

afterEach(() => {
	if (originalSupportBotModel === undefined) {
		delete process.env.SUPPORT_BOT_MODEL;
		return;
	}

	process.env.SUPPORT_BOT_MODEL = originalSupportBotModel;
});

describe("OpenAI model configuration", () => {
	test("defaults GPT support bots to Luna", () => {
		delete process.env.SUPPORT_BOT_MODEL;
		expect(getModelName("gpt")).toBe("gpt-5.6-luna");
	});

	test("honors the support bot model override", () => {
		process.env.SUPPORT_BOT_MODEL = "gpt-5.5";
		expect(getModelName("gpt")).toBe("gpt-5.5");
		expect(getOpenAIModelKwargs("gpt-5.5", "chat")).toBeUndefined();
	});

	test("preserves Luna's non-reasoning compatibility settings", () => {
		expect(getOpenAIModelKwargs("gpt-5.6-luna", "chat")).toEqual({
			reasoning_effort: "none",
		});
		expect(getOpenAIModelKwargs("gpt-5.6-luna", "responses")).toEqual({
			reasoning: { effort: "none" },
		});
	});

	test("calculates Luna wallet cost with configured pricing", () => {
		expect(
			calculateAICost(
				{ promptTokens: 10_000, completionTokens: 1_000 },
				"gpt-5.6-luna",
			),
		).toBe(320);
	});
});
