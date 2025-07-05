import React from 'react'
import { AddLocation } from './components';
import { cn } from '@/libs/utils';

export default async function VendorOnboarding(props: { searchParams: Promise<{ [key: string]: string | boolean }> }) {

    const searchParams = await props.searchParams;
    const saleId = searchParams.sid as string | null;

    return (
        <div className="space-y-4 max-w-xl mx-auto py-10">
            <div className={cn("flex flex-col gap-2")}>
                <div className="space-y-2">
                    <div className={cn("flex flex-col items-start space-y-1 text-foreground cursor-pointer")}>
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
