import * as Sentry from "@sentry/nextjs";
import { getSentryEdgeOptions } from "@/libs/observability/sentry-options";

Sentry.init(getSentryEdgeOptions());
