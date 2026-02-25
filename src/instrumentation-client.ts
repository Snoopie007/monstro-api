import * as Sentry from "@sentry/nextjs";
import { getSentryClientOptions } from "@/libs/observability/sentry-options";

Sentry.init(getSentryClientOptions());

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
