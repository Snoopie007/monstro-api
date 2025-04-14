
import { db } from '@/db/db';
import React from 'react';
import { decodeId } from '@/libs/server/sqids';
import { Location } from '@/types';
import { MemberStripePayments } from '@/libs/server/stripe';
import { StripeTax, TaxRate } from './components';

async function fetchLocation(lid: number): Promise<Location | null> {

    try {
        const location = await db.query.locations.findFirst({
            where: (location, { eq }) => eq(location.id, lid),
            with: {
                locationState: true
            }
        })
        if (!location) {
            throw new Error("Location not found");
        }
        return location;
    } catch (error) {
        console.log(error);
        return null;
    }
}


async function fetchStripe(lid: string) {
    const decodedId = decodeId(lid);
    try {

        const integration = await db.query.integrations.findFirst({
            where: (integration, { eq, and }) => and(eq(integration.locationId, decodedId), eq(integration.service, "stripe")),
        })

        if (!integration || !integration.accessToken) {
            throw new Error("Stripe account not found");
        }
        const stripe = new MemberStripePayments(integration.accessToken);
        const taxSettings = await stripe.retrieveTaxSettings();
        return taxSettings;
    } catch (error) {
        console.log(error);
        return null;
    }
}



export default async function SettingsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const decodedId = decodeId(params.id);
    const location = await fetchLocation(decodedId);
    const taxSettings = await fetchStripe(params.id);

    if (!location) {
        return <div>Error loading tax registrations</div>;
    }


    return (
        <div className='space-y-4'>
            <div className=" w-full flex flex-row justify-between items-center">
                <div className="space-y-1">
                    <div className='text-xl font-semibold mb-1'>Tax Settings</div>
                    <p className='text-sm'>Manage your tax settings below.</p>
                </div>
            </div>
            {taxSettings && <StripeTax lid={params.id} location={location} taxSettings={JSON.stringify(taxSettings)} />}
            <TaxRate lid={params.id} location={location} />
        </div>
    )
}
