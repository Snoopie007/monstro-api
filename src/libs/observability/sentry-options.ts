import type { BrowserOptions, EdgeOptions, NodeOptions } from "@sentry/nextjs";

function getDsn(): string | undefined {
  return process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
}

function getEnvironment(): string {
  return (
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    "development"
  );
}

function isDebugEnabled(): boolean {
  return process.env.OBS_SENTRY_DEBUG === "true";
}

export function getSentryClientOptions(): BrowserOptions {
  return {
    dsn: getDsn(),
    environment: getEnvironment(),
    debug: isDebugEnabled(),
    tracesSampleRate: 0,
    sendDefaultPii: false,
  };
}

export function getSentryServerOptions(): NodeOptions {
  return {
    dsn: getDsn(),
    environment: getEnvironment(),
    debug: isDebugEnabled(),
    tracesSampleRate: 0,
    sendDefaultPii: false,
  };
}

export function getSentryEdgeOptions(): EdgeOptions {
  return {
    dsn: getDsn(),
    environment: getEnvironment(),
    debug: isDebugEnabled(),
    tracesSampleRate: 0,
    sendDefaultPii: false,
  };
}
