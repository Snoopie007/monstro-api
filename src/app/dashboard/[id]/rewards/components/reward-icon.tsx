import React, { useRef, Dispatch, SetStateAction, useState } from 'react'
import { cn } from '@/libs/utils'
import { Camera, UploadCloudIcon, Trash2Icon } from 'lucide-react'
import Image from 'next/image'
interface RewardIconProps {
    value: string | undefined;
    onFilesChange: Dispatch<SetStateAction<File | undefined>>;
}
function RewardIcon({ value, onFilesChange }: RewardIconProps) {
    const iconRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | undefined>(value);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPreview(URL.createObjectURL(file));
            onFilesChange(file);
        }
    };


    return (
        <div className='flex flex-row gap-4'>

            <div className='flex-initial'>
                <input ref={iconRef} type='file' className={cn("hidden")}
                    onInput={handleFileChange}
                    accept='image/png'
                />
                {preview ?
                    (
                        <div className='relative flex flex-col gap-1 items-center justify-center  '>
                            <Image src={preview}
                                width={100}
                                height={100}
                                className="aspect-square rounded-full"
                                priority={true}
                                alt='Reward Icon' />
                            <div onClick={() => { iconRef.current?.click() }} className='cursor-pointer text-xs text-white font-semibold'>
                                Edit
                            </div>

                        </div>
                    ) : (
                        <div className='h-[80px] relative w-[80px] rounded-full overflow-hidden bg-gray-200 flex items-center justify-center cursor-pointer'
                            onClick={() => iconRef.current?.click()}
                        >
                            <Camera size={24} className='text-gray-400' />
                        </div>
                    )}
            </div>
            <div className="flex-1">
                <b className="font-semibold text-base">
                    Upload Reward Icon
                </b>
                <p className="text-xs mt-1 leading-5">
                    The proposed size is 300px * 300px. No bigger than 2.5 MB. Only PNG, JPG, JPEG are allowed.
                </p>
            </div>
        </div>
    )
}

export default RewardIcon