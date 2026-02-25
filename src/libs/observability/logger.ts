type LogLevel = "info" | "warn" | "error";
type ApiClientSide = "browser" | "server";

import { forwardLogToSentry } from "@/libs/observability/sentry";

const MAX_DEPTH = 5;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 50;
const MAX_STRING_LENGTH = 500;
const REDACTED = "[REDACTED]";

const SENSITIVE_KEY_PATTERNS = [
  /pass(word)?/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /api[-_]?key/i,
  /session/i,
  /jwt/i,
  /ssn/i,
  /card(number)?/i,
  /cvv/i,
];

function shouldLog(): boolean {
  return process.env.NODE_ENV === "development";
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function truncateString(value: string): string {
  if (value.length <= MAX_STRING_LENGTH) return value;
  return `${value.slice(0, MAX_STRING_LENGTH)}... [truncated ${value.length - MAX_STRING_LENGTH} chars]`;
}

function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    const normalized = typeof value === "string"
      ? value
      : { name: value.name, type: value.type, size: value.size };
    if (obj[key] === undefined) {
      obj[key] = normalized;
      continue;
    }
    if (Array.isArray(obj[key])) {
      (obj[key] as unknown[]).push(normalized);
      continue;
    }
    obj[key] = [obj[key], normalized];
  }
  return obj;
}

function headersToObject(headers: Headers): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    obj[key] = value;
  }
  return obj;
}

function sanitizeForLogging(
  value: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return truncateString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return String(value);
  if (typeof value === "function") return `[Function ${(value as Function).name || "anonymous"}]`;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof URL) return value.toString();
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      cause: sanitizeForLogging(value.cause, depth + 1, seen),
    };
  }
  if (typeof Headers !== "undefined" && value instanceof Headers) {
    return sanitizeForLogging(headersToObject(value), depth + 1, seen);
  }
  if (typeof FormData !== "undefined" && value instanceof FormData) {
    return sanitizeForLogging(formDataToObject(value), depth + 1, seen);
  }

  if (depth >= MAX_DEPTH) return "[MaxDepth]";

  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeForLogging(item, depth + 1, seen));
    if (value.length > MAX_ARRAY_ITEMS) {
      items.push(`[... ${value.length - MAX_ARRAY_ITEMS} more items]`);
    }
    return items;
  }

  if (typeof value === "object") {
    if (seen.has(value as object)) return "[Circular]";
    seen.add(value as object);

    const entries = Object.entries(value as Record<string, unknown>);
    const sanitized: Record<string, unknown> = {};

    for (const [index, [key, child]] of entries.entries()) {
      if (index >= MAX_OBJECT_KEYS) {
        sanitized.__truncatedKeys = entries.length - MAX_OBJECT_KEYS;
        break;
      }
      sanitized[key] = isSensitiveKey(key) ? REDACTED : sanitizeForLogging(child, depth + 1, seen);
    }

    return sanitized;
  }

  return String(value);
}

function extractStringFromValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

export function extractErrorMessage(input: unknown): string | undefined {
  if (input instanceof Error) return input.message;

  const direct = extractStringFromValue(input);
  if (direct) return direct;

  const queue: unknown[] = [input];
  const seen = new WeakSet<object>();
  let visited = 0;

  while (queue.length > 0 && visited < 40) {
    visited += 1;
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (seen.has(current as object)) continue;
    seen.add(current as object);

    const obj = current as Record<string, unknown>;
    const messageLike = ["error", "message", "detail", "details", "reason", "title"];
    for (const key of messageLike) {
      const value = extractStringFromValue(obj[key]);
      if (value) return value;
    }

    for (const child of Object.values(obj)) {
      if (child && typeof child === "object") queue.push(child);
    }
  }

  return undefined;
}

function emit(level: LogLevel, source: string, event: string, payload: Record<string, unknown>): void {
  const base = {
    timestamp: new Date().toISOString(),
    source,
    event,
  };

  const message = `[obs][${source}] ${event}`;
  const data = { ...base, ...(sanitizeForLogging(payload) as Record<string, unknown>) };

  if (level === "error" || level === "warn") {
    forwardLogToSentry({
      level,
      source,
      event,
      message,
      payload: data,
    });
  }

  if (!shouldLog()) return;

  if (level === "error") {
    console.error(message, data);
    return;
  }
  if (level === "warn") {
    console.warn(message, data);
    return;
  }
  console.log(message, data);
}

export function logApiClientCall(params: {
  client: ApiClientSide;
  method: string;
  url: string;
  correlationId?: string;
  requestData?: unknown;
  requestHeaders?: unknown;
  context?: Record<string, unknown>;
}): void {
  emit("info", "api-client", "request", {
    client: params.client,
    method: params.method,
    url: params.url,
    correlationId: params.correlationId,
    requestData: params.requestData,
    requestHeaders: params.requestHeaders,
    context: params.context,
  });
}

export function logApiClientResponse(params: {
  client: ApiClientSide;
  method: string;
  url: string;
  correlationId?: string;
  status: number;
  durationMs: number;
  responseData?: unknown;
  errorMessage?: string;
  context?: Record<string, unknown>;
}): void {
  const level: LogLevel = params.status >= 500
    ? "error"
    : params.status >= 400
      ? "warn"
      : "info";

  emit(level, "api-client", "response", {
    client: params.client,
    method: params.method,
    url: params.url,
    correlationId: params.correlationId,
    status: params.status,
    durationMs: params.durationMs,
    errorMessage: params.errorMessage,
    responseData: params.responseData,
    context: params.context,
  });
}

export function logFrontendRuntimeError(params: {
  type: "error" | "unhandledrejection";
  error: unknown;
  metadata?: Record<string, unknown>;
}): void {
  emit("error", "frontend-runtime", params.type, {
    error: params.error,
    metadata: params.metadata,
  });
}

export function logNextApiWarning(params: {
  route: string;
  message: string;
  metadata?: Record<string, unknown>;
}): void {
  emit("warn", "nextjs-api", "warning", {
    route: params.route,
    message: params.message,
    metadata: params.metadata,
  });
}

export function logNextApiError(params: {
  route: string;
  error: unknown;
  metadata?: Record<string, unknown>;
}): void {
  emit("error", "nextjs-api", "error", {
    route: params.route,
    error: params.error,
    metadata: params.metadata,
  });
}
