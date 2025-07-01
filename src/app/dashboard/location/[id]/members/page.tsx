
import { MemberList } from "./components/MemberList";

import { auth } from "@/auth";
import { db } from "@/db/db";
import { and } from "drizzle-orm";

async function fetchStripeKeys(id: string): Promise<string | null> {
    try {
        const integrations = await db.query.integrations.findFirst({
            where: (integration, { eq }) => (and(eq(integration.locationId, id), eq(integration.service, "stripe"))),
            columns: {
                apiKey: true
            }
        })
        return integrations ? integrations.apiKey : '';
    } catch (error) {
        console.log("error", error);
        return null;
    }
}


export default async function Members(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await auth()
    const stripeKey = await fetchStripeKeys(params.id)

    return (
        <MemberList params={params} stripeKey={stripeKey} />
    )
}
