import { NextRequest, NextResponse } from "next/server"
import { serversideApiClient } from "@/libs/api/server"

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params
    const locationId = params.id

    // TODO: WALLET BALANCE CHECK
    // Before enabling this feature in production, add a check to ensure
    // the location has sufficient wallet balance to cover AI API costs.
    // The check should be done here on the frontend before calling the backend.

    try {
        const body = await request.json()
        const { csvData, headers } = body

        if (!csvData || !headers) {
            return NextResponse.json(
                { error: "Missing CSV data or headers" },
                { status: 400 }
            )
        }

        const api = serversideApiClient()
        const result = await api.post(
            `/x/loc/${locationId}/migration/analyze`,
            { csvData, headers }
        )

        return NextResponse.json(result)
    } catch (error) {
        console.error("Migration analysis error:", error)
        
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
