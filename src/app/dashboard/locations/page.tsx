import { db } from '@/db/db'
import React from 'react'
import { auth } from '@/auth'
import { LocationsList } from './components/LocationsList'



async function fetchLocations(vid: number) {
    try {
        const locations = await db.query.locations.findMany({
            where: (locations, { eq }) => eq(locations.vendorId, vid),
            with: {
                locationState: true
            }
        })
        return locations
    } catch (error) {
        console.error(error)
        return []
    }
}


export default async function LocationsPage() {
    const session = await auth();
    if (!session) {
        return (
            <div>Invalid Session</div>
        )
    }
    const locations = await fetchLocations(session.user.vendorId)
    return (
        <div className='w-full h-full'>
            <div className='p-4'>
                <LocationsList locations={locations} />
            </div>
        </div>
    )
}
