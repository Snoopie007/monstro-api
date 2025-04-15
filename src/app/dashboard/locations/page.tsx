import { db } from '@/db/db'
import React from 'react'
import { auth } from '@/auth'
import { Card } from '@/components/ui'
import { Badge } from '@/components/ui'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'



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
                <div className='grid grid-cols-4 gap-4'>
                    {locations.map((location) => (
                        <Link href={`/dashboard/locations/${location.id}`} key={location.id}>
                            <Card key={location.id} className='p-4 rounded-sm min-h-36 bg-foreground/5 border-foreground/10'>
                                <div className='flex flex-row items-start gap-2 justify-between'>

                                    <div className='flex flex-col items-start justify-start'>
                                        <h3 className='text-sm font-bold'>{location.name}</h3>

                                    </div>
                                    <div>
                                        <ChevronRight size={18} />
                                    </div>
                                </div>
                                <div className='flex flex-col items-start space-y-2 text-xs text-muted-foreground '>
                                    <div className='space-y-0'>
                                        <p >{location.address}</p>
                                        <p >{location.city}, {location.state} {location.postalCode}</p>
                                    </div>
                                    <Badge variant={location.locationState.status === 'active' ? 'active' : 'inactive'} className='text-[0.65rem]'>{location.locationState.status}</Badge>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
