"use client"
import React from 'react'
import { Button, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { format } from 'date-fns';
import { TaxSettings } from './TaxSettings';
import { useTaxSettings } from '@/hooks/useTaxSettings';
import Stripe from 'stripe';
import { Location } from '@/types';
import { tryCatch } from '@/libs/utils';
import { toast } from 'react-toastify';


export function TaxList({ lid, location }: { lid: string, location: Location }) {
    const { data, isLoading, error, mutate } = useTaxSettings(lid);

    if (isLoading) {
        return <Skeleton className='w-full h-20' />;
    }

    if (error) {
        return <div>Error: {error.message}</div>;
    }




    if (!data || data.settings.status !== "active") {
        return (
            <TaxSettings lid={lid} location={location} />
        );
    }

    async function handleTest(rid: string) {
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${location.id}/tax/test`, {
                method: "POST",
                body: JSON.stringify({
                    registrationId: rid
                })
            })
        )
    }

    async function expireTax(rid: string) {
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${location.id}/tax/registrations/${rid}`, {
                method: "PATCH"
            })
        )
        if (error || !result || !result.ok) {
            toast.error(error?.message || "Failed to expire tax registration");
            return;
        }
        await mutate();
    }
    return (

        <div className="border rounded-sm">
            <Table >
                <TableHeader>
                    <TableRow >
                        {['State', 'Country', 'Type', 'Active From', ''].map((header, i) => (
                            <TableHead key={i}>{header}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.registrations.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="py-2  text-center">No tax registrations found</TableCell>
                        </TableRow>
                    )}
                    {data.registrations?.map((registration: Stripe.Tax.Registration, index: number) => (
                        <TableRow key={index} >
                            <TableCell className="py-2">{registration.country_options?.us?.state}</TableCell>
                            <TableCell className="py-2">{registration.country}</TableCell>

                            <TableCell className="py-2 capitalize">{registration.country_options?.us?.type.replaceAll("_", " ")}</TableCell>
                            <TableCell className="py-2">{format(registration.active_from * 1000, 'MMM d, yyyy')}</TableCell>
                            <TableCell className="py-2">
                                <Button variant={"destructive"} size={"sm"}
                                    onClick={() => handleTest(registration.id)}
                                >
                                    Test
                                </Button>
                            </TableCell>


                        </TableRow>
                    ))}
                </TableBody>
            </Table>

        </div>

    )
}
