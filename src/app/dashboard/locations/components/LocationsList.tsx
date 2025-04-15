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

    return (

        <div className='flex flex-col gap-4'>
            <div className='flex flex-row gap-2 items-center justify-start'>

                <Button variant={'foreground'} size={'sm'} asChild>
                    <Link href='/onboarding' >New Location</Link>
                </Button>
                <Input placeholder='Search' className='w-36 h-9 rounded-sm border-foreground/10' value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className='grid grid-cols-4 gap-4'>
                {filteredLocations.map((l) => (
                    <Link href={`/dashboard/locations/${l.id}`} key={l.id}>
                        <Card key={l.id} className='p-4 rounded-sm min-h-36 bg-foreground/5 border-foreground/10'>
                            <div className='flex flex-row items-start gap-2 justify-between'>

                                <div className='flex flex-col items-start justify-start'>
                                    <h3 className='text-sm font-bold'>{l.name}</h3>

                                </div>
                                <div>
                                    <ChevronRight size={18} />
                                </div>
                            </div>
                            <div className='flex flex-col items-start space-y-2 text-xs text-muted-foreground '>
                                <div className='space-y-0'>
                                    <p >{l.address}</p>
                                    <p >{l.city}, {l.state} {l.postalCode}</p>
                                </div>
                                <Badge variant={l.locationState?.status === 'active' ? 'active' : 'inactive'} className='text-[0.65rem]'>
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

