'use client';
import { Badge, Button, Card } from '@/components/ui';
import Link from 'next/link';
import { Location } from '@/types';
import { ChevronRight } from 'lucide-react';
import { Input } from '@/components/forms';
import { useEffect, useState } from 'react';

export const LocationsList = ({ locations }: { locations: Location[] }) => {
    const [filteredLocations, setFilteredLocations] = useState<Location[]>(locations);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (search) {
            setFilteredLocations(locations.filter((location) => location.name.toLowerCase().includes(search.toLowerCase())));
        } else {
            setFilteredLocations(locations);
        }
    }, [search]);

    function url(location: Location) {
        if (location.locationState?.status === 'incomplete') {
            return `/dashboard/locations/new/${location.id}`;
        }
        return `/dashboard/location/${location.id}`;
    }

    return (
        <div className='flex flex-col gap-4'>
            <div className='flex flex-row gap-2 items-center justify-start'>
                <Input placeholder='Search for location...' className='w-[400px] h-10 rounded-lg border-foreground/10'
                    value={search} onChange={(e) => setSearch(e.target.value)} />
                <Button variant='foreground' asChild>
                    <Link href='/dashboard/locations/new'>
                        Add Location
                    </Link>
                </Button>
            </div>
            <div className='grid grid-cols-4 gap-4'>
                {filteredLocations.map((l) => (
                    <Link href={url(l)} key={l.id}>
                        <Card key={l.id} className='p-4 rounded-lg min-h-40  space-y-3 bg-foreground/5 border-foreground/10'>
                            <div className='flex flex-row items-start gap-2 justify-between'>
                                <h3 className=' font-bold'>{l.name}</h3>

                                <ChevronRight size={18} />
                            </div>
                            <div className='flex flex-col items-start space-y-1  text-sm text-muted-foreground '>
                                <div className='space-y-0'>
                                    <p >{l.address}</p>
                                    <p >{l.city}, {l.state} {l.postalCode}</p>
                                </div>
                                <Badge member={l.locationState?.status === 'active' ? 'active' : 'inactive'} >
                                    {l.locationState?.status}
                                </Badge>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>

        </div>
    );
};

