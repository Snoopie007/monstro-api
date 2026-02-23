"use client";

import { useEffect } from "react";
import {
  extractErrorMessage,
  logApiClientCall,
  logApiClientResponse,
  logFrontendRuntimeError,
} from "@/libs/observability/logger";

const FETCH_PATCH_KEY = "__monstroFetchPatched";

function toHeadersObject(headers?: HeadersInit): Record<string, string> | undefined {
  if (!headers) return undefined;

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return headers;
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return null;

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function parseRequestBody(body: BodyInit | null | undefined): unknown {
  if (!body) return undefined;

  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }

  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return Object.fromEntries(body.entries());
  }

  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
    return Object.fromEntries(body.entries());
  }

  return "[Non-serializable request body]";
}

export default function ClientObservability() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const globalScope = window as Window & {
      [FETCH_PATCH_KEY]?: boolean;
    };

    const originalFetch = window.fetch.bind(window);

    if (!globalScope[FETCH_PATCH_KEY]) {
      globalScope[FETCH_PATCH_KEY] = true;

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const method = init?.method || (input instanceof Request ? input.method : "GET");
        const url = input instanceof Request ? input.url : String(input);
        const startedAt = Date.now();

        logApiClientCall({
          client: "browser",
          method,
          url,
          requestData: parseRequestBody(init?.body),
          requestHeaders: toHeadersObject(init?.headers),
          context: { source: "window.fetch" },
        });

        try {
          const response = await originalFetch(input, init);
          const responseData = await parseResponsePayload(response.clone());

          logApiClientResponse({
            client: "browser",
            method,
            url,
            status: response.status,
            durationMs: Date.now() - startedAt,
            responseData,
            errorMessage: response.ok ? undefined : extractErrorMessage(responseData) || response.statusText,
            context: { source: "window.fetch" },
          });

          return response;
        } catch (error) {
          logApiClientResponse({
            client: "browser",
            method,
            url,
            status: 0,
            durationMs: Date.now() - startedAt,
            errorMessage: extractErrorMessage(error) || "Network error",
            context: { source: "window.fetch" },
          });
          throw error;
        }
      };
    }

    const onError = (event: ErrorEvent) => {
      logFrontendRuntimeError({
        type: "error",
        error: event.error || new Error(event.message),
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      logFrontendRuntimeError({
        type: "unhandledrejection",
        error: event.reason,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      if (globalScope[FETCH_PATCH_KEY]) {
        window.fetch = originalFetch;
        globalScope[FETCH_PATCH_KEY] = false;
      }
    };
  }, []);

  return null;
}
