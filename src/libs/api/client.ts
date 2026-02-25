/**
 * Client-side API client for browser environments
 * Requires JWT token for authentication
 */
import {
  extractErrorMessage,
  logApiClientCall,
  logApiClientResponse,
} from "@/libs/observability/logger";
import {
  createCorrelationId,
  withCorrelationIdHeader,
} from "@/libs/observability/correlation";

export interface ApiClient {
  get: <T>(url: string, params?: Record<string, string | number | boolean | string[]>) => Promise<T>;
  post: (url: string, data?: unknown) => Promise<unknown>;
  patch: (url: string, data?: unknown) => Promise<unknown>;
  put: (url: string, data?: unknown) => Promise<unknown>;
  delete: (url: string) => Promise<unknown>;
}

const REQUEST_TIMEOUT_MS = 45000;

function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(input, {
    ...init,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
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

export const clientsideApiClient = (token?: string): ApiClient => {
  const baseUrl = process.env.NEXT_PUBLIC_MONSTRO_API_URL || "http://localhost:3000/api";

  const withBase = (endpoint: string): string => {
    const finalBaseUrl = endpoint.startsWith("/x") ? baseUrl.replace(/\/api$/, "") : baseUrl;
    return `${finalBaseUrl}${endpoint}`;
  };

  const buildUrl = (
    endpoint: string,
    params?: Record<string, string | number | boolean | string[]>,
  ): URL => {
    const url = new URL(withBase(endpoint));
    if (!params) return url;

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) {
        url.searchParams.set(key, value.join(","));
      } else {
        url.searchParams.set(key, String(value));
      }
    }

    return url;
  };

  const createHeaders = (hasBody: boolean): HeadersInit => {
    const headers: HeadersInit = {};
    if (hasBody) {
      (headers as Record<string, string>)["Content-Type"] = "application/json";
    }
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  const request = async (
    method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
    endpoint: string,
    options?: {
      params?: Record<string, string | number | boolean | string[]>;
      data?: unknown;
      timeoutMs?: number;
    },
  ): Promise<unknown> => {
    const url = buildUrl(endpoint, options?.params);
    const hasFormData = typeof FormData !== "undefined" && options?.data instanceof FormData;
    const correlationId = createCorrelationId();
    const headers = withCorrelationIdHeader(
      hasFormData ? createHeaders(false) : createHeaders(method !== "GET" && method !== "DELETE"),
      correlationId,
    );
    const startedAt = Date.now();

    logApiClientCall({
      client: "browser",
      method,
      url: url.toString(),
      correlationId,
      requestData: options?.data,
      requestHeaders: headers,
    });

    try {
      const response = await (options?.timeoutMs
        ? fetchWithTimeout(url.toString(), {
            method,
            headers,
            body: options?.data
              ? hasFormData
                ? options.data as FormData
                : JSON.stringify(options.data)
              : undefined,
          }, options.timeoutMs)
        : fetch(url.toString(), {
            method,
            headers,
            body: options?.data
              ? hasFormData
                ? options.data as FormData
                : JSON.stringify(options.data)
              : undefined,
          }));

      const payload = await parseResponsePayload(response);
      const errorMessage = extractErrorMessage(payload) || response.statusText;

      logApiClientResponse({
        client: "browser",
        method,
        url: url.toString(),
        correlationId,
        status: response.status,
        durationMs: Date.now() - startedAt,
        responseData: payload,
        errorMessage: response.ok ? undefined : errorMessage,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${errorMessage}`);
      }

      return payload;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("API Error:")) {
        throw error;
      }

      logApiClientResponse({
        client: "browser",
        method,
        url: url.toString(),
        correlationId,
        status: 0,
        durationMs: Date.now() - startedAt,
        errorMessage: extractErrorMessage(error) || "Network error",
      });

      throw error;
    }
  };

  return {
    get: async <T>(endpoint: string, params?: Record<string, string | number | boolean | string[]>) => {
      return await request("GET", endpoint, { params }) as T;
    },
    post: async (endpoint: string, data?: unknown) => {
      return await request("POST", endpoint, {
        data,
        timeoutMs: REQUEST_TIMEOUT_MS,
      });
    },
    patch: async (endpoint: string, data?: unknown) => {
      return await request("PATCH", endpoint, {
        data,
        timeoutMs: REQUEST_TIMEOUT_MS,
      });
    },
    put: async (endpoint: string, data?: unknown) => {
      return await request("PUT", endpoint, { data });
    },
    delete: async (endpoint: string) => {
      return await request("DELETE", endpoint);
    },
  };
};
