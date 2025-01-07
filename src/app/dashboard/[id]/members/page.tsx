
import { Session } from "next-auth";
import { MemberList } from "./components/member-list";

import { auth } from "@/auth";
import { db } from "@/db/db";
import { and } from "drizzle-orm";
import { decodeId } from "@/libs/server-utils";

async function fetchStripeKeys(id: string, session: Session | null): Promise<string | null> {
    const decodedId = decodeId(id);
    try {
        const integrations = await db.query.integrations.findFirst({
            where: (integration, { eq }) => (and(eq(integration.locationId, decodedId), eq(integration.service, "Stripe"))),
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
    const stripeKey = await fetchStripeKeys(params.id, session)

    return (
        <MemberList params={params} stripeKey={stripeKey} />
    )
}
