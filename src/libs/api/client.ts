/**
 * Client-side API client for browser environments
 * Does not include auth - relies on cookies/session
 */

export interface ApiClient {
    get: (url: string, params?: Record<string, string | number | boolean | string[]>) => Promise<unknown>;
    post: (url: string, data?: Record<string, unknown>) => Promise<unknown>;
}

export const clientsideApiClient = (): ApiClient => {
    const baseUrl = window.location.origin

    return {
        get: async (endpoint: string, params?: Record<string, string | number | boolean | string[]>) => {
            const url = new URL(`${baseUrl}${endpoint}`)

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

            const response = await fetch(url.toString(), {
                credentials: 'include', // Include cookies for auth
            })
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`)
            }
            return response.json()
        },
        post: async (endpoint: string, data?: Record<string, unknown>) => {
            const url = new URL(`${baseUrl}${endpoint}`)
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Include cookies for auth
                body: JSON.stringify(data)
            })
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`)
            }
            return response.json()
        }
    }
}

