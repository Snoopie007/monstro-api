/**
 * Server-side API client for Node.js/Next.js server environments
 * Includes auth token from session
 */

import { auth } from "@/libs/auth/server";
import type { ExtendedUser } from "@/types/next-auth";
import { getSupabaseJWT } from "../server/supabase";

export interface ApiClient {
    get: (url: string, params?: Record<string, string | number | boolean | string[]>) => Promise<unknown>;
    post: (url: string, data?: Record<string, unknown>) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
}

export const serversideApiClient = (): ApiClient => {
    const baseUrl = process.env.MONSTRO_API_URL || 'http://localhost:3000'

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
            const sbToken = await getSupabaseJWT();
            
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

            console.log(response)
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`)
            }
            return response.json()
        },
        delete: async (endpoint: string) => {
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
                // No user session
                // Use service role key which is a valid Supabase JWT
                const serviceKey = process.env.SUPABASE_SERVICE_KEY;
                if (serviceKey) {
                    headers['Authorization'] = `Bearer ${serviceKey}`;
                }
            }
            
            const url = new URL(`${baseUrl}${endpoint}`)
            const response = await fetch(url.toString(), {
                method: 'DELETE',
                headers
            })

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`)
            }
            return response.json()
        }
    }
}

/**
 * Service-to-service API client that always uses service role key
 * Use this for background tasks like scheduling emails where user auth isn't needed
 */
export const serviceApiClient = (): ApiClient => {
    const baseUrl = process.env.MONSTRO_API_URL || 'http://localhost:3000'
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    const getHeaders = () => ({
        'Content-Type': 'application/json',
        ...(serviceKey ? { 'Authorization': `Bearer ${serviceKey}` } : {})
    });

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
                headers: getHeaders()
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
                headers: getHeaders(),
                body: JSON.stringify(data)
            })

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`)
            }
            return response.json()
        },
        delete: async (endpoint: string) => {
            const url = new URL(`${baseUrl}${endpoint}`)
            const response = await fetch(url.toString(), {
                method: 'DELETE',
                headers: getHeaders()
            })

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`)
            }
            return response.json()
        }
    }
}

