// AchievementIcons.tsx
import React, { useEffect, useState, useRef } from 'react';
import { ScrollArea } from '@/components/ui';
import { CloudUploadIcon } from 'lucide-react';
import { toast } from 'react-toastify';

interface AchievementIconsProps {
    value: string;
    handleIconChange: (icon: string) => void;
}

export function AchievementIcons({ value, handleIconChange }: AchievementIconsProps) {
    const [icons, setIcons] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchBadges = async () => {
            try {
                const response = await fetch('/api/protected/s3/badges');
                if (!response.ok) throw new Error('Failed to fetch');
                const data = await response.json();
                setIcons(data.map((item: any) => item.url));
            } catch (error) {
                console.error('Failed to fetch badges:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBadges();
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

       
        const img = new Image();
        const url = URL.createObjectURL(file);
        
        img.onload = () => {
            if (img.width === 250 && img.height === 250) {
                setIcons(prev => [...prev, url]);
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

    if (loading) {
        return <div>Loading icons...</div>;
    }

    return (
        <ScrollArea className='h-60'>
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
                {icons.map((image, i) => (
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