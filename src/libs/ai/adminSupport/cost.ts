export function calculateAiCostMicrousd(
  modelName: string,
  value: unknown,
  completedWebSearches = 0,
) {
  const prices = {
    "gpt-5.5": { input: 5, cachedInput: 0.5, output: 30 },
    "gpt-5.6-luna": { input: 1, cachedInput: 0.1, output: 6 },
  }[modelName];

  if (!prices || !value || typeof value !== "object") {
    return null;
  }

  const usage = value as Record<string, unknown>;
  const details = usage.input_token_details ?? usage.input_tokens_details;
  const tokenDetails =
    details && typeof details === "object"
      ? (details as Record<string, unknown>)
      : {};
  const inputTokens = usage.input_tokens as number;
  const cachedInputTokens = (tokenDetails.cache_read ??
    tokenDetails.cached_tokens ??
    0) as number;
  const outputTokens = usage.output_tokens as number;

  if (
    ![inputTokens, cachedInputTokens, outputTokens, completedWebSearches].every(
      (count) => Number.isSafeInteger(count) && count >= 0,
    ) ||
    cachedInputTokens > inputTokens
  ) {
    return null;
  }

  const rounded = Math.round(
    (inputTokens - cachedInputTokens) * prices.input +
      cachedInputTokens * prices.cachedInput +
      outputTokens * prices.output +
      completedWebSearches * 10_000,
  );
  return Number.isSafeInteger(rounded) ? rounded : null;
}

export function calculateResponsesCostMicrousd(
  modelName: string,
  payload: unknown,
) {
  if (!payload || typeof payload !== "object") return null;

  const response = payload as Record<string, unknown>;
  if (response.status !== undefined && response.status !== "completed") return 0;

  const completedWebSearches = Array.isArray(response.output)
    ? response.output.filter((item) => {
        if (!item || typeof item !== "object") return false;
        const call = item as Record<string, unknown>;
        const action = call.action;
        return (
          call.type === "web_search_call" &&
          call.status === "completed" &&
          action !== null &&
          typeof action === "object" &&
          (action as Record<string, unknown>).type === "search"
        );
      }).length
    : 0;

  return calculateAiCostMicrousd(
    modelName,
    response.usage,
    completedWebSearches,
  );
}
