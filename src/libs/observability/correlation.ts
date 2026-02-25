export const CORRELATION_ID_HEADER = "x-correlation-id";

export function createCorrelationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `cid_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

export function getCorrelationIdFromHeaders(headers?: HeadersInit): string | undefined {
  if (!headers) return undefined;

  if (headers instanceof Headers) {
    return headers.get(CORRELATION_ID_HEADER) || undefined;
  }

  if (Array.isArray(headers)) {
    const match = headers.find(([key]) => key.toLowerCase() === CORRELATION_ID_HEADER);
    return match?.[1];
  }

  const record = headers as Record<string, string>;
  for (const [key, value] of Object.entries(record)) {
    if (key.toLowerCase() === CORRELATION_ID_HEADER) return value;
  }

  return undefined;
}

export function withCorrelationIdHeader(
  headers: HeadersInit | undefined,
  correlationId: string,
): Headers {
  const nextHeaders = new Headers(headers);
  if (!nextHeaders.has(CORRELATION_ID_HEADER)) {
    nextHeaders.set(CORRELATION_ID_HEADER, correlationId);
  }
  return nextHeaders;
}
