
import { Button } from '@/components/ui/button'
import { useIntegrations } from '@/hooks';
import { cn, tryCatch } from '@/libs/utils';
import { Integration } from '@/types';
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
        <li className="bg-foreground/5 flex flex-row gap-2 items-center w-full min-h-4 p-3 rounded-lg ">
            <div className='flex-1 flex flex-row gap-2 items-center'>
                <div className="rounded-sm overflow-hidden">
                    <Image src={`/images/partners/${integration.service.toLowerCase()}-logo.webp`} alt={integration.service} width={34} height={34} />
                </div>
                <div>
                    <div className="font-medium ">{integration.service}</div>
                </div>
            </div>
            <div>
                <Button
                    onClick={() => disconnect()}
                    variant="ghost"
                    size="icon"
                    className='size-6 text-red-500 hover:bg-foreground/5 hover:text-red-500'
                >
                    {loading ? <Loader2 size={"16"} className={cn('animate-spin size-3.5 ')} /> :
                        <Trash2 className='size-4' />}
                </Button>
            </div>
        </li>
    )
}