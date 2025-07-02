'use client'
import React, { useEffect, useState, useRef } from 'react';
import { ScrollArea, Skeleton } from '@/components/ui';
import { CloudUploadIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import { sleep, tryCatch } from '@/libs/utils';

interface AchievementIconsProps {
    value: string;
    handleIconChange: (icon: string) => void;
}

type BadgeBlob = {
    url: string;
    key: string;
}

export function AchievementIcons({ value, handleIconChange }: AchievementIconsProps) {
    const [badges, setBadges] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (badges.length > 0) return;
        const controller = new AbortController();
        fetchBadges(controller.signal);

        return () => controller.abort();
    }, []);

    async function fetchBadges(signal: AbortSignal) {
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch('/api/protected/s3/badges', { signal })
        )

        await sleep(1000);
        if (error || !result || !result.ok) {
            setLoading(false);
            return;
        }

        const data = await result.json();
        setBadges(data.map((blob: BadgeBlob) => blob.url));
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;


        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            if (img.width === 250 && img.height === 250) {
                setBadges(prev => [...prev, url]);
                handleIconChange(url);

            } else {
                toast('Image must be exactly 250x250 pixels');
                URL.revokeObjectURL(url);
            }
        };

        img.onerror = () => {
            toast('Error loading image');
            URL.revokeObjectURL(url);
        };

        img.src = url;
    };



    return (
        <ScrollArea className='h-40 '>
            <div className='grid grid-cols-6 gap-2'>
                <div className='col-span-1'>
                    <div className='flex flex-row gap-2'>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept="image/*"
                            className="hidden"
                        />
                        <div
                            className='size-[55px] bg-foreground/5 rounded-md flex items-center justify-center cursor-pointer hover:bg-foreground/10'
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <CloudUploadIcon className='size-6 text-muted-foreground' />
                        </div>
                    </div>
                </div>
                {loading && (
                    <>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className='w-[50px] h-[50px] rounded-md' />
                        ))}
                    </>
                )}

                {badges.map((image, i) => (
                    <div key={i}
                        className={`relative group cursor-pointer 
                                transition-all duration-300 hover:scale-110 data-[selected=true]:scale-110`}
                        data-selected={value === image}
                        onClick={() => handleIconChange(image)}
                    >
                        <img
                            src={image}
                            alt='achievement icon'
                            width={50}
                            height={50}
                            className='rounded-md transition-transform grayscale-100 hover:grayscale-0 
                            duration-300 hover:brightness-110 group-data-[selected=true]:grayscale-0'
                        />
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}