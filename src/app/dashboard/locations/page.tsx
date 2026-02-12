import { db } from '@/db/db'
import { LocationsList } from './components/LocationsList'
import { inArray } from 'drizzle-orm'
import { auth } from '@/libs/auth/server'



async function fetchLocations(id: string, role: string) {
    try {
        if (role === "vendor") {
            const locations = await db.query.locations.findMany({
                where: (locations, { eq }) => eq(locations.vendorId, id),
                with: {
                    locationState: true
                }
            })
            return locations
        } else if (role === "staff") {
            const staffId = Number(id)
            if (!Number.isInteger(staffId)) return []
            const staffLocations = await db.query.staffsLocations.findMany({
                where: (staffLocations, { eq }) => eq(staffLocations.staffId, staffId),
            })

            const locationIds = staffLocations.map(sl => sl.locationId)

            if (locationIds.length === 0) {
                return []
            }

            const locations = await db.query.locations.findMany({
                where: (locations) => inArray(locations.id, locationIds),
                with: {
                    locationState: true
                }
            })
            return locations
        }
        return []
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

    const locations = await fetchLocations(session.user.role === "staff" ? session.user.staffId! : session.user.vendorId!, session.user.role!) || []
    return (
        <div className='w-full h-full'>
            <div className='p-4'>
                <LocationsList locations={locations} />

            </div>
        </div>
    )
}
