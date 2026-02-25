import * as Sentry from "@sentry/nextjs";
import {
  getSentryClientOptions,
  getSentryEdgeOptions,
  getSentryServerOptions,
} from "@/libs/observability/sentry-options";

type SentryMode = "off" | "errors" | "errors_and_warnings";
type SentryLevel = "warn" | "error";

let fallbackInitialized = false;

function isDebugEnabled(): boolean {
  return process.env.OBS_SENTRY_DEBUG === "true";
}

function hasDsn(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN);
}

function ensureSentryInitialized(): boolean {
  if (Sentry.getClient()) return true;
  if (!hasDsn()) return false;
  if (fallbackInitialized) return Boolean(Sentry.getClient());

  if (typeof window !== "undefined") {
    Sentry.init(getSentryClientOptions());
  } else if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init(getSentryEdgeOptions());
  } else {
    Sentry.init(getSentryServerOptions());
  }

  fallbackInitialized = true;
  return Boolean(Sentry.getClient());
}

function parseSentryMode(): SentryMode {
  const raw = (
    process.env.OBS_SENTRY_MODE ||
    process.env.NEXT_PUBLIC_OBS_SENTRY_MODE ||
    "errors"
  ).toLowerCase();

  if (raw === "off") return "off";
  if (raw === "errors_and_warnings") return "errors_and_warnings";
  return "errors";
}

function shouldForward(level: SentryLevel): boolean {
  const mode = parseSentryMode();
  if (mode === "off") return false;
  if (level === "error") return true;
  return mode === "errors_and_warnings";
}

function getErrorFromPayload(payload: Record<string, unknown>): Error {
  const rawError = payload.error;
  if (rawError instanceof Error) return rawError;

  const message =
    (typeof payload.errorMessage === "string" && payload.errorMessage) ||
    (typeof payload.message === "string" && payload.message) ||
    "Observability error";

  return new Error(message);
}

export function forwardLogToSentry(params: {
  level: SentryLevel;
  source: string;
  event: string;
  message: string;
  payload: Record<string, unknown>;
}): void {
  if (!shouldForward(params.level)) return;
  if (!ensureSentryInitialized()) {
    if (isDebugEnabled()) {
      console.warn("[obs][sentry] skipped log forwarding: Sentry not initialized or missing DSN", {
        level: params.level,
        source: params.source,
        event: params.event,
      });
    }
    return;
  }

  const correlationId =
    typeof params.payload.correlationId === "string"
      ? params.payload.correlationId
      : undefined;

  const tags: Record<string, string> = {
    obs_source: params.source,
    obs_event: params.event,
  };

  if (correlationId) {
    tags.correlation_id = correlationId;
  }

  if (params.level === "error") {
    Sentry.captureException(getErrorFromPayload(params.payload), {
      tags,
      extra: params.payload,
      level: "error",
    });

    if (isDebugEnabled()) {
      console.info("[obs][sentry] forwarded log", {
        level: params.level,
        source: params.source,
        event: params.event,
        correlationId,
      });
    }

    return;
  }

  Sentry.captureMessage(params.message, {
    tags,
    extra: params.payload,
    level: "warning",
  });

  if (isDebugEnabled()) {
    console.info("[obs][sentry] forwarded log", {
      level: params.level,
      source: params.source,
      event: params.event,
      correlationId,
    });
  }
}
