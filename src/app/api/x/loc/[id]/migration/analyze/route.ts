import { NextRequest, NextResponse } from "next/server"
import { ApiClientError, serversideApiClient } from "@/libs/api/server"
import { logNextRouteError, logNextRouteWarning } from "@/libs/observability/next-api"
import { CORRELATION_ID_HEADER } from "@/libs/observability/correlation"

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params
    const locationId = params.id
    const correlationId = request.headers.get(CORRELATION_ID_HEADER) || undefined

    try {
        const body = await request.json()
        const { csvData, headers } = body

        if (!csvData || !headers) {
            return NextResponse.json(
                { error: "Missing CSV data or headers" },
                { status: 400 }
            )
        }

        const api = serversideApiClient({ correlationId })
        const result = await api.post(
            `/x/loc/${locationId}/migration/analyze`,
            { csvData, headers }
        )

        return NextResponse.json(result)
    } catch (error) {
        if (error instanceof ApiClientError) {
            logNextRouteWarning("/api/x/loc/[id]/migration/analyze", "Downstream monstro-api request failed", {
                correlationId,
                status: error.status,
                endpoint: error.endpoint,
                body: error.body,
            })

            const payload = typeof error.body === "object" && error.body !== null
                ? error.body
                : { error: String(error.body || error.message) }

            return NextResponse.json(payload, { status: error.status })
        }

        logNextRouteError("/api/x/loc/[id]/migration/analyze", error, { correlationId })
        
        if (error instanceof Error) {
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            )
        }
        
        return NextResponse.json(
            { error: "Failed to analyze CSV" },
            { status: 500 }
        )
    }
}
