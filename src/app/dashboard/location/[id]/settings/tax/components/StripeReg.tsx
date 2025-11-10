'use client'
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    CardFooter,
    Button,
} from '@/components/ui'
import { PlusIcon } from 'lucide-react';
import Stripe from 'stripe';

interface StripeRegistrationsProps {
    registrations: Stripe.Tax.Registration[];
}

export function StripeRegistrations({ registrations }: StripeRegistrationsProps) {
    return (
        <Card>
            <CardHeader className="px-6 pt-6 pb-2 space-y-2">
                <CardTitle>Stripe Tax Registrations</CardTitle>
                <CardDescription>
                    In order to collect tax in a specific region, you must register your tax account for that state, city, or county.
                </CardDescription>
            </CardHeader>
            {registrations.length > 0 && (
                <div className='px-6 pb-4'>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {['Country', 'State', 'Type', 'Status'].map((header, idx) => (
                                    <TableHead key={header} className={idx === 0 ? "pl-0" : undefined}>
                                        {header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {registrations.map((registration) => (
                                <TaxRegistration key={registration.id} registration={registration} />
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
            <CardFooter className="flex justify-end border-t px-6 bg-foreground/5 py-3 border-foreground/10 gap-2">
                <Button variant="foreground" size="sm" className='flex flex-row items-center gap-2'>
                    <span>        Register</span>
                    <PlusIcon className='size-4' />
                </Button>
            </CardFooter>
        </Card>
    )
}

function TaxRegistration({ registration }: { registration: Stripe.Tax.Registration }) {
    const options = registration.country_options;
    return (
        <TableRow key={registration.id}>
            <TableCell className="pl-0">{registration.country}</TableCell>
            <TableCell>{options?.us?.state}</TableCell>
            <TableCell>{options?.us?.type}</TableCell>
            <TableCell>{registration.status}</TableCell>
        </TableRow>
    )
}