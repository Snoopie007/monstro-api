
import { Button } from '@/components/ui/button'
import { cn, tryCatch } from '@/libs/utils';
import { LucideLoader2, Trash2 } from 'lucide-react';
import Image from 'next/image'
import React, { useState } from 'react'
import { toast } from 'react-toastify';
import useSWR from 'swr';

interface IntergrationProps {
    integrations: { service: string, id: number }[],
    locationId: string
}

export default function IntegrationList({ integrations, locationId }: IntergrationProps) {
    const [loading, setLoading] = useState<boolean>(false);
    const { mutate } = useSWR(`/api/protected/loc/${locationId}/integrations/`);

    const disconnect = async (iId: number) => {
        setLoading(true);
        try {
            const { result, error } = await tryCatch(
                fetch(`/api/protected/loc/${locationId}/integrations/`, {
                    method: 'DELETE',
                    body: JSON.stringify({ id: iId })
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

    if (integrations.length === 0) {
        return <div className='text-center'>No integrations found.</div>;
    }

    return (
        <ul className="flex flex-col gap-2">
            {integrations.map((integration, index) => (
                <li key={index} className="bg-background flex flex-row gap-2 items-center w-full min-h-4 py-2 px-6 rounded-[4px] border ">
                    <div className='flex-1 flex flex-row gap-4 items-center'>
                        <div className="rounded-sm overflow-hidden">
                            <Image src={`/images/partners/${integration.service.toLowerCase()}-logo.png`} alt={integration.service} width={30} height={30} />
                        </div>
                        <div>
                            <div className="font-medium text-sm">{integration.service}</div>
                        </div>
                    </div>
                    <div>
                        <Button
                            onClick={() => disconnect(integration.id)}
                            variant="ghost"
                            size="sm"
                            type="button"
                        >
                            <LucideLoader2 size={"16"} className={cn('animate-spin hidden', { 'inline-block': loading })} />
                            <Trash2 size={'16'} className={cn('hidden stroke-red-500', { 'inline-block': !loading })} />
                        </Button>
                    </div>
                </li>
            ))}
        </ul>
    );
}

