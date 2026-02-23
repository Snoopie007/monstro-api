import { logNextApiError, logNextApiWarning } from "@/libs/observability/logger";

export function logNextRouteWarning(
  route: string,
  message: string,
  metadata?: Record<string, unknown>,
): void {
  logNextApiWarning({ route, message, metadata });
}

export function logNextRouteError(
  route: string,
  error: unknown,
  metadata?: Record<string, unknown>,
): void {
  logNextApiError({ route, error, metadata });
}
