'use client';
import { use } from "react";
import IntegrationList from './integrations'
import { useIntegrations } from '@/hooks'
import { Button, Skeleton } from '@/components/ui'
import SectionLoader from '@/components/SectionLoading'
import { useRouter } from "next/navigation";
import { Input } from "@/components/forms";
import Link from "next/link";

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
                    <Input placeholder='Search Intergrations' />
                    <Button variant='foreground' asChild>
                        <Link href={`/dashboard/location/${params.id}/settings/integrations/browse`}>
                            Browse Market
                        </Link>
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
