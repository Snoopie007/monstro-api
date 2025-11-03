import { auth } from "@/auth";
import type { ExtendedUser } from "@/types/next-auth";

export interface ApiClient {
    get: (url: string, params?: Record<string, string | number | boolean | string[]>) => Promise<unknown>;
    post: (url: string, data?: Record<string, unknown>) => Promise<unknown>;
}

export const createMonstroApiClient = (): ApiClient => {
    // Detect environment and set appropriate base URL
    const getBaseUrl = () => {
        if (typeof window !== 'undefined') {
            // Browser environment
            return window.location.origin
        }
        // Server environment
        return process.env.MONSTRO_API_URL || 'http://localhost:3000'
    }

    const baseUrl = getBaseUrl()

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

            const response = await fetch(url.toString())
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`)
            }
            return response.json()
        },
        post: async (endpoint: string, data?: Record<string, unknown>) => {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            }
            
            // Try to get user session token first
            const session = await auth();
            const sbToken = (session?.user as ExtendedUser)?.sbToken;
            
            if (sbToken) {
                // User is authenticated, use their token
                headers['Authorization'] = `Bearer ${sbToken}`;
            } else {
                // No user session (e.g., password reset, login token flows)
                // Use service role key which is a valid Supabase JWT
                const serviceKey = process.env.SUPABASE_SERVICE_KEY;
                if (serviceKey) {
                    headers['Authorization'] = `Bearer ${serviceKey}`;
                }
            }
            
            const url = new URL(`${baseUrl}${endpoint}`)
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers,
                body: JSON.stringify(data)
            })
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`)
            }
            return response.json()
        }
    }
}