export interface ApiClient {
    get: (url: string, params?: Record<string, any>) => Promise<any>
}

export const createMonstroApiClient = (): ApiClient => {
    const baseUrl = '/api'

    return {
        get: async (endpoint: string, params?: Record<string, any>) => {
            const url = new URL(`${baseUrl}${endpoint}`, window.location.origin)

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
    }
}