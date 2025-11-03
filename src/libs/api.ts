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
            const url = new URL(`${baseUrl}${endpoint}`)
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            })
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`)
            }
            return response.json()
        }
    }
}

/**
 * Server-side function to send emails via monstro-api
 * Call this from server routes/actions in monstro-15 to send templated emails
 * 
 * @example
 * await sendEmailViaApi({
 *   recipient: 'user@example.com',
 *   template: 'LoginTokenEmail',
 *   subject: 'Verify your email',
 *   data: {
 *     user: { name: 'John', email: 'john@example.com' },
 *     otp: { token: '123456' }
 *   }
 * })
 */
export async function sendEmailViaApi(params: {
    recipient: string;
    template: string;
    subject: string;
    data: Record<string, string | number | boolean | object | null | undefined>;
}): Promise<{ success: boolean; message: string }> {
    const apiUrl = process.env.MONSTRO_API_URL || 'http://localhost:3000'
    
    try {
        const response = await fetch(`${apiUrl}/protected/locations/email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`)
        }

        return await response.json()
    } catch (error) {
        console.error('Failed to send email via API:', error)
        throw error
    }
}