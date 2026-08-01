export const DEFAULT_OPENAI_MODEL = "gpt-5.6-luna";
export const DEFAULT_OPENAI_REASONING_EFFORT = "none" as const;

export function getOpenAIModelKwargs(
  modelName: string,
  api: "chat" | "responses",
): Record<string, unknown> | undefined {
  if (!modelName.startsWith("gpt-5.6")) return undefined;

  return api === "responses"
    ? { reasoning: { effort: DEFAULT_OPENAI_REASONING_EFFORT } }
    : { reasoning_effort: DEFAULT_OPENAI_REASONING_EFFORT };
}
