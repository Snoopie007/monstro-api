import { db } from '@/db/db';
import { integrations } from '@/db/schemas';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server'
import { VendorGHL } from '@/libs/server/ghl';

export async function GET(req: NextRequest, props: { params: Promise<{ iid: number }> }) {
    const params = await props.params;
    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get("action")
    try {
        const integration = await db.query.integrations.findFirst({
            where: eq(integrations.id, params.iid)
        })

        if (!integration) {
            return NextResponse.json({ message: "Integration not found." }, { status: 404 })
        }
        const ghl = new VendorGHL()
        await ghl.getAccessToken(integration)
        let returnData: { name: string, id: string }[] = [];
        if (action === "getCalendarSlots" || action === "addToCalendar") {

            const calendars = await ghl.getCalendars(integration.integrationId)

            returnData = calendars.map((calendar: { name: string, id: string }) => ({
                name: calendar.name,
                id: calendar.id
            }))
        }
        if (action === "addToWorkflow") {

            const workflows = await ghl.getWorkflows(integration.integrationId)
            returnData = workflows
                .filter((workflow: { name: string, id: string, status: string }) => workflow.status === 'published')
                .map((workflow: { name: string, id: string }) => ({
                    name: workflow.name,
                    id: workflow.id
                }))
        }

        return NextResponse.json(returnData, { status: 200 })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ message: "Location not found." }, { status: 404 })
    }
}
