import React from 'react'
import { ScrollArea } from '@/components/ui';
import { CloudUploadIcon } from 'lucide-react';

const Icons = [
    "https://randomuser.me/api/portraits/lego/1.jpg",
    "https://randomuser.me/api/portraits/lego/2.jpg",
    "https://randomuser.me/api/portraits/lego/3.jpg",
    "https://randomuser.me/api/portraits/lego/4.jpg",
]

interface AchievementIconsProps {
    value: string;
    handleIconChange: (icon: string) => void;
}

export function AchievementIcons({ value, handleIconChange }: AchievementIconsProps) {
    return (

        <ScrollArea className='h-60'>
            <div className='grid grid-cols-6 gap-2'>
                <div className='col-span-1'>
                    <div className='flex flex-row gap-2'>
                        <div className='size-[55px] bg-foreground/5 rounded-md flex items-center justify-center cursor-pointer' >
                            <CloudUploadIcon className='size-6 text-muted-foreground' />
                        </div>
                    </div>
                </div>
                {Icons.map((image, i) => (
                    <div key={i}
                        className={`relative group cursor-pointer 
                                transition-all duration-300 hover:scale-110 data-[selected=true]:scale-110`}
                        data-selected={value === image}
                        onClick={() => {
                            handleIconChange(image)
                        }}
                    >
                        <img src={image} alt='avatar' width={50} height={50}
                            className='rounded-md transition-transform grayscale-100 hover:grayscale-0 
            duration-300 hover:brightness-110 group-data-[selected=true]:grayscale-0'

                        />

                    </div>
                ))}
            </div>
        </ScrollArea>
    )
}