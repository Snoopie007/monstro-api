import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui';
import { Button } from '@/components/ui/button'
import { useIntegrations } from '@/hooks';
import { cn, tryCatch } from '@/libs/utils';
import { Integration } from '@subtrees/types';
import { Loader2, Trash2 } from 'lucide-react';
import Image from 'next/image'
import React, { useState } from 'react'
import { toast } from 'react-toastify';


type IntegrationItemProps = {
    integration: Integration,
    lid: string,
}

export function IntegrationItem({ integration, lid }: IntegrationItemProps) {
    const [loading, setLoading] = useState<boolean>(false);
    const { mutate } = useIntegrations(lid);


    async function disconnect() {
        setLoading(true);
        try {
            const { result, error } = await tryCatch(
                fetch(`/api/protected/loc/${lid}/integrations/${integration.id}`, {
                    method: 'DELETE'
                })
            );
            if (error || !result || !result.ok) throw error;
            await mutate();
            setLoading(false);
        } catch (error: any) {
            toast.error(error);
            setLoading(false);
        }
    };
    return (
        <Item variant="muted" className="border-0 rounded-none px-0 border-b last:border-b-0 border-foreground/5 py-4">
            <ItemMedia variant="image" className="size-10">
                <Image src={`/images/partners/${integration.service.toLowerCase()}-logo.webp`}
                    alt={integration.service} fill className='object-contain'
                />

            </ItemMedia>
            <ItemContent className='flex flex-col gap-0'>
                <ItemTitle className='capitalize font-medium'>{integration.service}</ItemTitle>
                <ItemDescription> Connected to your Monstro-X Account </ItemDescription>
            </ItemContent>
            <ItemActions>
                <Button
                    onClick={() => disconnect()}
                    variant="destructive"
                    size="xs"
                >
                    {loading ? <Loader2 size={"16"} className={cn('animate-spin size-3.5 ')} /> :
                        'Disconnect'}
                </Button>
            </ItemActions>
        </Item>
    )
}