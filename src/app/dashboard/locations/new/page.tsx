import React from 'react'
import { auth } from "@/auth";
import { AddLocation } from './components';
import { redirect } from 'next/navigation';
import { cn } from '@/libs/utils';

export default async function VendorOnboarding(props: { searchParams: Promise<{ [key: string]: string | boolean }> }) {
    const session = await auth();
    const searchParams = await props.searchParams;
    const saleId = searchParams.sid as string | null;

    if (session?.user.locations.length > 0) {
        const pendingLocation = session?.user.locations.find((location: { id: string, status: string }) => location.status === "Pending")
        if (pendingLocation) {
            return redirect(`/onboarding/${pendingLocation.id}`)
        }
    }

    return (
        <div className="space-y-4">
            <div className={cn("flex flex-col gap-2")}>
                <div className="space-y-2">
                    <div className={cn("flex flex-col items-start space-y-1 text-black cursor-pointer")}>
                        <h1 className="font-semibold text-lg leading-none">
                            Create your business profile
                        </h1>
                        <p className="text-gray-600 text-sm">
                            Find your business on Google or manually add your business information below.
                        </p>
                    </div>
                    <div>
                        <AddLocation saleId={saleId} />
                    </div>
                </div>
            </div>
        </div>
    );
}
