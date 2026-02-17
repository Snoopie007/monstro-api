/**
 * Client-side API client for browser environments
 * Requires JWT token for authentication
 */

export interface ApiClient {
    get: <T>(url: string, params?: Record<string, string | number | boolean | string[]>) => Promise<T>;
    post: (url: string, data?: any) => Promise<unknown>;
    patch: (url: string, data?: any) => Promise<unknown>;
    put: (url: string, data?: any) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
}

const REQUEST_TIMEOUT_MS = 45000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs: number = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(input, {
        ...init,
        signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
}

export const clientsideApiClient = (token?: string): ApiClient => {
    const baseUrl = process.env.NEXT_PUBLIC_MONSTRO_API_URL || 'http://localhost:3000/api'

    return {
        get: async (endpoint: string, params?: Record<string, string | number | boolean | string[]>) => {
            // For XRoutes, strip /api from baseUrl
            const finalBaseUrl = endpoint.startsWith('/x') ? baseUrl.replace(/\/api$/, '') : baseUrl;

            const url = new URL(`${finalBaseUrl}${endpoint}`)

            if (params) {
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                        if (Array.isArray(value)) {
                            url.searchParams.set(key, value.join(','))
                        } else {
                            url.searchParams.set(key, String(value))
                        }
                    }
                })
            }

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(url.toString(), {
                headers,
            })

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`)
            }
            return response.json()
        },
        post: async (endpoint: string, data?: Record<string, unknown> | FormData) => {
            // For XRoutes, strip /api from baseUrl
            const finalBaseUrl = endpoint.startsWith('/x') ? baseUrl.replace(/\/api$/, '') : baseUrl;
            const url = new URL(`${finalBaseUrl}${endpoint}`)

            const headers: HeadersInit = {};

            // Only set Content-Type if not FormData (FormData sets its own boundary)
            if (!(data instanceof FormData)) {
                headers['Content-Type'] = 'application/json';
            }

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetchWithTimeout(url.toString(), {
                method: 'POST',
                headers,
                body: data instanceof FormData ? data : JSON.stringify(data)
            })

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[API Client] Error response:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText,
                });
                throw new Error(`API Error: ${response.status} - ${errorText}`)
            }
            return response.json()
        },
        patch: async (endpoint: string, data?: Record<string, unknown>) => {
            const finalBaseUrl = endpoint.startsWith('/x') ? baseUrl.replace(/\/api$/, '') : baseUrl;
            const url = new URL(`${finalBaseUrl}${endpoint}`)

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetchWithTimeout(url.toString(), {
                method: 'PATCH',
                headers,
                body: JSON.stringify(data)
            })

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[API Client] PATCH Error response:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText,
                });
                throw new Error(`API Error: ${response.status} - ${errorText}`)
            }
            return response.json()
        },
        put: async (endpoint: string, data?: Record<string, unknown>) => {
            // For XRoutes, strip /api from baseUrl
            const finalBaseUrl = endpoint.startsWith('/x') ? baseUrl.replace(/\/api$/, '') : baseUrl;
            const url = new URL(`${finalBaseUrl}${endpoint}`)

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(url.toString(), {
                method: 'PUT',
                headers,
                body: JSON.stringify(data)
            })

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[API Client] PUT Error response:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText,
                });
                throw new Error(`API Error: ${response.status} - ${errorText}`)
            }
            return response.json()
        },
        delete: async (endpoint: string) => {
            // For XRoutes, strip /api from baseUrl
            const finalBaseUrl = endpoint.startsWith('/x') ? baseUrl.replace(/\/api$/, '') : baseUrl;
            const url = new URL(`${finalBaseUrl}${endpoint}`)

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(url.toString(), {
                method: 'DELETE',
                headers,
            })

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[API Client] DELETE Error response:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText,
                });
                throw new Error(`API Error: ${response.status} - ${errorText}`)
            }
            return response.json()
        }
    }
}
