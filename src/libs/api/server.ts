/**
 * Server-side API client for Node.js/Next.js server environments
 * Includes auth token from session
 */
import { auth } from "@/libs/auth/server";
import type { ExtendedUser } from "@subtrees/types/user";
import {
  extractErrorMessage,
  logApiClientCall,
  logApiClientResponse,
} from "@/libs/observability/logger";
import {
  createCorrelationId,
  withCorrelationIdHeader,
} from "@/libs/observability/correlation";
import { getSupabaseJWT } from "../server/supabase";

export interface ApiClient {
  get: (url: string, params?: Record<string, string | number | boolean | string[]>) => Promise<unknown>;
  post: (url: string, data?: Record<string, unknown>) => Promise<unknown>;
  delete: (url: string) => Promise<unknown>;
}

export class ApiClientError extends Error {
  status: number;
  endpoint: string;
  body: unknown;

  constructor(message: string, status: number, endpoint: string, body: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.endpoint = endpoint;
    this.body = body;
  }
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return null;

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function withBase(baseUrl: string, endpoint: string): string {
  const finalBaseUrl = endpoint.startsWith("/x") ? baseUrl.replace(/\/api$/, "") : baseUrl;
  return `${finalBaseUrl}${endpoint}`;
}

function toUrl(
  baseUrl: string,
  endpoint: string,
  params?: Record<string, string | number | boolean | string[]>,
): URL {
  const url = new URL(withBase(baseUrl, endpoint));
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
}

async function throwApiError(params: {
  response: Response;
  endpoint: string;
  method: string;
  url: string;
  correlationId: string;
  startedAt: number;
}): Promise<never> {
  const body = await parseResponseBody(params.response);
  const errorMessage = extractErrorMessage(body) || params.response.statusText;

  logApiClientResponse({
    client: "server",
    method: params.method,
    url: params.url,
    correlationId: params.correlationId,
    status: params.response.status,
    durationMs: Date.now() - params.startedAt,
    responseData: body,
    errorMessage,
  });

  throw new ApiClientError(
    `API Error ${params.response.status} on ${params.endpoint} - ${errorMessage}`,
    params.response.status,
    params.endpoint,
    body,
  );
}

export const serversideApiClient = (options?: { correlationId?: string }): ApiClient => {
  const baseUrl = process.env.MONSTRO_API_URL || "http://localhost:3000";
  const rootCorrelationId = options?.correlationId || createCorrelationId();

  return {
    get: async (endpoint: string, params?: Record<string, string | number | boolean | string[]>) => {
      const method = "GET";
      const url = toUrl(baseUrl, endpoint, params);
      const correlationId = rootCorrelationId;
      const headers = withCorrelationIdHeader(undefined, correlationId);
      const startedAt = Date.now();

      logApiClientCall({
        client: "server",
        method,
        url: url.toString(),
        correlationId,
        requestHeaders: headers,
      });

      const response = await fetch(url.toString(), { headers });
      if (!response.ok) {
        await throwApiError({ response, endpoint, method, url: url.toString(), correlationId, startedAt });
      }

      const payload = await parseResponseBody(response);
      logApiClientResponse({
        client: "server",
        method,
        url: url.toString(),
        correlationId,
        status: response.status,
        durationMs: Date.now() - startedAt,
        responseData: payload,
      });

      return payload;
    },
    post: async (endpoint: string, data?: Record<string, unknown>) => {
      const method = "POST";
      const correlationId = rootCorrelationId;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const sbToken = await getSupabaseJWT();

      if (sbToken) {
        headers["Authorization"] = `Bearer ${sbToken}`;
      } else {
        const serviceKey = process.env.SUPABASE_SERVICE_KEY;
        if (serviceKey) {
          headers["Authorization"] = `Bearer ${serviceKey}`;
        }
      }

      const headersWithCorrelation = withCorrelationIdHeader(headers, correlationId);

      const url = toUrl(baseUrl, endpoint);
      const startedAt = Date.now();

      logApiClientCall({
        client: "server",
        method,
        url: url.toString(),
        correlationId,
        requestData: data,
        requestHeaders: headersWithCorrelation,
      });

      const response = await fetch(url.toString(), {
        method,
        headers: headersWithCorrelation,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        await throwApiError({ response, endpoint, method, url: url.toString(), correlationId, startedAt });
      }

      const payload = await parseResponseBody(response);
      logApiClientResponse({
        client: "server",
        method,
        url: url.toString(),
        correlationId,
        status: response.status,
        durationMs: Date.now() - startedAt,
        responseData: payload,
      });

      return payload;
    },
    delete: async (endpoint: string) => {
      const method = "DELETE";
      const correlationId = rootCorrelationId;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const session = await auth();
      const sbToken = (session?.user as unknown as ExtendedUser).sbToken;

      if (sbToken) {
        headers["Authorization"] = `Bearer ${sbToken}`;
      } else {
        const serviceKey = process.env.SUPABASE_SERVICE_KEY;
        if (serviceKey) {
          headers["Authorization"] = `Bearer ${serviceKey}`;
        }
      }

      const headersWithCorrelation = withCorrelationIdHeader(headers, correlationId);

      const url = toUrl(baseUrl, endpoint);
      const startedAt = Date.now();

      logApiClientCall({
        client: "server",
        method,
        url: url.toString(),
        correlationId,
        requestHeaders: headersWithCorrelation,
      });

      const response = await fetch(url.toString(), {
        method,
        headers: headersWithCorrelation,
      });

      if (!response.ok) {
        await throwApiError({ response, endpoint, method, url: url.toString(), correlationId, startedAt });
      }

      const payload = await parseResponseBody(response);
      logApiClientResponse({
        client: "server",
        method,
        url: url.toString(),
        correlationId,
        status: response.status,
        durationMs: Date.now() - startedAt,
        responseData: payload,
      });

      return payload;
    },
  };
};

/**
 * Service-to-service API client that always uses service role key
 * Use this for background tasks like scheduling emails where user auth isn't needed
 */
export const serviceApiClient = (options?: { correlationId?: string }): ApiClient => {
  const baseUrl = process.env.MONSTRO_API_URL || "http://localhost:3000";
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const rootCorrelationId = options?.correlationId || createCorrelationId();

  const getHeaders = () => ({
    "Content-Type": "application/json",
    ...(serviceKey ? { Authorization: `Bearer ${serviceKey}` } : {}),
  });

  return {
    get: async (endpoint: string, params?: Record<string, string | number | boolean | string[]>) => {
      const method = "GET";
      const url = toUrl(baseUrl, endpoint, params);
      const correlationId = rootCorrelationId;
      const headers = withCorrelationIdHeader(getHeaders(), correlationId);
      const startedAt = Date.now();

      logApiClientCall({
        client: "server",
        method,
        url: url.toString(),
        correlationId,
        requestHeaders: headers,
      });

      const response = await fetch(url.toString(), { headers });
      if (!response.ok) {
        await throwApiError({ response, endpoint, method, url: url.toString(), correlationId, startedAt });
      }

      const payload = await parseResponseBody(response);
      logApiClientResponse({
        client: "server",
        method,
        url: url.toString(),
        correlationId,
        status: response.status,
        durationMs: Date.now() - startedAt,
        responseData: payload,
      });

      return payload;
    },
    post: async (endpoint: string, data?: Record<string, unknown>) => {
      const method = "POST";
      const url = toUrl(baseUrl, endpoint);
      const correlationId = rootCorrelationId;
      const headers = withCorrelationIdHeader(getHeaders(), correlationId);
      const startedAt = Date.now();

      logApiClientCall({
        client: "server",
        method,
        url: url.toString(),
        correlationId,
        requestData: data,
        requestHeaders: headers,
      });

      const response = await fetch(url.toString(), {
        method,
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        await throwApiError({ response, endpoint, method, url: url.toString(), correlationId, startedAt });
      }

      const payload = await parseResponseBody(response);
      logApiClientResponse({
        client: "server",
        method,
        url: url.toString(),
        correlationId,
        status: response.status,
        durationMs: Date.now() - startedAt,
        responseData: payload,
      });

      return payload;
    },
    delete: async (endpoint: string) => {
      const method = "DELETE";
      const url = toUrl(baseUrl, endpoint);
      const correlationId = rootCorrelationId;
      const headers = withCorrelationIdHeader(getHeaders(), correlationId);
      const startedAt = Date.now();

      logApiClientCall({
        client: "server",
        method,
        url: url.toString(),
        correlationId,
        requestHeaders: headers,
      });

      const response = await fetch(url.toString(), {
        method,
        headers,
      });

      if (!response.ok) {
        await throwApiError({ response, endpoint, method, url: url.toString(), correlationId, startedAt });
      }

      const payload = await parseResponseBody(response);
      logApiClientResponse({
        client: "server",
        method,
        url: url.toString(),
        correlationId,
        status: response.status,
        durationMs: Date.now() - startedAt,
        responseData: payload,
      });

      return payload;
    },
  };
};
