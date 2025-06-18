'use client';
import { use } from "react";
import { useIntegrations } from '@/hooks'
import { Button } from '@/components/ui'
import SectionLoader from '@/components/SectionLoading'
import { Input } from "@/components/forms";
import Link from "next/link";
import { IntegrationItem } from "./IntegrationItem";
import { Integration } from "@/types";

export default function IntegrationPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { integrations, isLoading } = useIntegrations(params.id);

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
                integrations.length > 0 ? (
                    <ul className="grid grid-cols-2 gap-2">
                        {integrations.map((integration: Integration, index: number) => (
                            <IntegrationItem key={index} integration={integration} lid={params.id} />
                        ))}
                    </ul>
                ) : <div className='text-center'>No integrations found.</div>
            ) : (
                <SectionLoader />
            )}
        </section >
    )
}
