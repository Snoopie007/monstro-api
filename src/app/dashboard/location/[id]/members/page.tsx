import { db } from '@/db/db'
import { and } from 'drizzle-orm'
import MembersPage from './components/MembersPage'

async function fetchStripeKeys(id: string): Promise<string | null> {
    try {
        const integrations = await db.query.integrations.findFirst({
            where: (integration, { eq }) =>
                and(
                    eq(integration.locationId, id),
                    eq(integration.service, 'stripe')
                ),
            columns: {
                apiKey: true,
            },
        })
        return integrations ? integrations.apiKey : ''
    } catch (error) {
        console.log('error', error)
        return null
    }
}

export default async function Members(props: {
    params: Promise<{ id: string }>
}) {
    const params = await props.params
    const stripeKey = await fetchStripeKeys(params.id)

    return (
        <MembersPage id={params.id} stripeKey={stripeKey} />
    )
}
