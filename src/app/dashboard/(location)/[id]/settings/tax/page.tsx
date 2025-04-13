
import { db } from '@/db/db';
import React from 'react';
import { decodeId } from '@/libs/server/sqids';
import { Location } from '@/types';
import { RegisterTax, TaxList } from './components';

async function fetchLocation(lid: number): Promise<Location | null> {

    try {
        const location = await db.query.locations.findFirst({
            where: (location, { eq }) => eq(location.id, lid),
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



export default async function SettingsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const decodedId = decodeId(params.id);
    const location = await fetchLocation(decodedId);
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
                <div className='flex flex-col gap-4'>
                    <RegisterTax lid={params.id} location={location} />
                </div>
            </div>
            <TaxList lid={params.id} location={location} />
        </div>
    )
}
