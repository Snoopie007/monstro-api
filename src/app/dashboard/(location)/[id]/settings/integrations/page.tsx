'use client';
import { use } from "react";
import { cn } from '@/libs/utils'
import Link from 'next/link'
import IntegrationList from './integrations'
import { useIntegrations } from '@/hooks'
import { Button, Skeleton } from '@/components/ui'
import SectionLoader from '@/components/section-loading'
import { useRouter } from "next/navigation";

export default function IntegrationPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { integrations, isLoading } = useIntegrations(params.id);
    const router = useRouter();
    return (
        <section className="text-black-100">
            <div className="mb-4">
                <div className='text-xl font-semibold mb-1'>Intergrations</div>
                <p className='text-sm'>Connect your Monstro Account with a third-party service to manage payments or sync data.</p>
                <div className='flex flex-row gap-2 items-center py-3'>
                    <input placeholder='Search Intergrations' className='flex-1 rounded-xs text-sm bg-transparent py-1.5 px-4 border-foreground/60 border ' />
                    <Button variant='foreground' size='sm' className="rounded-xs" onClick={() => {
                        router.push(`/dashboard/${params.id}/settings/integrations/browse`);
                    }}>
                        Browse Market
                    </Button>

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
