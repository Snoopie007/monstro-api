import * as Sentry from "@sentry/nextjs";
import { getSentryServerOptions } from "@/libs/observability/sentry-options";

Sentry.init(getSentryServerOptions());
