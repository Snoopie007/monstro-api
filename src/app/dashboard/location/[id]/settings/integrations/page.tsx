'use client';
import { use } from "react";
import { useIntegrations } from '@/hooks'
import { Button, EmptyMedia, EmptyHeader, Skeleton, Empty, EmptyTitle, EmptyDescription } from '@/components/ui'
import { Input } from "@/components/forms";
import Link from "next/link";
import { IntegrationItem } from "./IntegrationItem";
import { Integration } from "@/types";
import { Tag } from "lucide-react";

export default function IntegrationPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { integrations, isLoading } = useIntegrations(params.id);

    return (
        <section className="text-black-100">
            <div className="mb-4">
                <div className='text-xl font-semibold mb-1'>Intergrations</div>
                <p className='text-sm'>Connect your Monstro-X Account with a third-party service to manage payments or sync data.</p>
                <div className='flex flex-row gap-2 items-center py-3'>
                    <Input placeholder='Search Intergrations' className='h-11' />
                    <Button variant='foreground' size="lg" asChild>
                        <Link href={`/dashboard/location/${params.id}/settings/integrations/browse`}>
                            Browse Market
                        </Link>
                    </Button>

                </div>
            </div>
            <div className="bg-foreground/5 rounded-lg px-4">
                {(!isLoading) ? (
                    integrations.length > 0 ? (
                        integrations.map((integration: Integration, index: number) => (
                            <IntegrationItem key={index} integration={integration} lid={params.id} />
                        ))
                    ) : (
                        <Empty >
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Tag className="size-4" />
                                </EmptyMedia>
                                <EmptyTitle>No integrations found</EmptyTitle>
                                <EmptyDescription>Add an integration to your location to get started.</EmptyDescription>
                            </EmptyHeader>

                        </Empty>
                    )
                ) : (
                    <Skeleton className="w-full h-10" />
                )}
            </div>
        </section >
    )
}
