'use client';
import { use } from "react";
import { cn } from '@/libs/utils'
import Link from 'next/link'
import IntegrationList from './integrations'
import { useIntegrations } from '@/hooks/use-integrations'
import { Skeleton } from '@/components/ui'
import SectionLoader from '@/components/section-loading'

export default function IntegrationPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { integrations, isLoading } = useIntegrations(params.id);

    return (
        <section className="text-black-100">
            <div className="mb-4">
                <div className='text-xl font-semibold mb-1'>Intergrations</div>
                <p className='text-sm'>Connect your Monstro Account with a third-party service to manage payments or sync data.</p>
                <div className='flex flex-row gap-4 items-center py-3'>
                    <input placeholder='Search Intergrations' className='flex-1 rounded-sm text-sm bg-transparent py-3  px-4 border font-roboto ' />
                    <Link href={`/dashboard/${params.id}/settings/intergrations/browse`}
                        className={cn('text-sm px-4 bg-foreground py-3 text-center block h-auto rounded-sm font-semibold text-background')}>
                        Browse Market
                    </Link>
                </div>
            </div>
            {(!isLoading) ? (
                <IntegrationList integrations={integrations} locationId={params.id} />
            ) : (
                <SectionLoader />
            )}
        </section >
    )
}
