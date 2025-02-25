
import Image from 'next/image'
import { cn, tryCatch } from '@/libs/utils'
import React, { useEffect } from 'react'
import { XCircle } from 'lucide-react'

interface RewardImagesProps {
    name?: string
    images: string[]
    onRemoveImage: (images: string) => void

}

export function RewardImages({ name, images, onRemoveImage }: RewardImagesProps) {

    const [previews, setPreviews] = React.useState<string[]>(images || []);
    const inputRef = React.useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    }, [inputRef])
    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (files) {
            const urls = Array.from(files).map((file) => URL.createObjectURL(file))
            setPreviews((prev) => [...prev, ...urls])
        }
    }

    function handleDrop(e: React.DragEvent<HTMLInputElement>) {
        if (previews.length > 0) return;
        e.preventDefault();
        const droppedFiles = e.dataTransfer.files;
        if (e.dataTransfer.files.length > 1 || !droppedFiles[0]) return;
        Array.from(droppedFiles).map((file) => URL.createObjectURL(file))
        handleFileChange({ target: { files: droppedFiles } } as React.ChangeEvent<HTMLInputElement>)
    }

    async function handleRemoveImage(url: string) {
        const filteredImages = previews.filter(p => p !== url);
        setPreviews(filteredImages);
        onRemoveImage(url);
    }

    return (
        <>
            <div className='flex flex-col'>
                <div className='text-sm font-semibold'>Upload Images for Reward</div>
                <div className='text-xs text-gray-500'>
                    Upload up to 5 images for the reward The proposed size is 800px * 800px. No bigger than 1 MB. Only PNG, JPG, JPEG are allowed..
                </div>
            </div>
            <div className='flex flex-col gap-4'>
                <div className='flex-initial'>
                    <input ref={inputRef} type='file' multiple name={name || 'files'} className={cn("hidden")} onInput={handleFileChange} accept='image/*' />
                    <div
                        onClick={() => inputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={(event) => event.preventDefault()}
                        className='flex h-32 cursor-pointer items-center justify-center rounded-sm border border-dashed border-strong'
                    >
                        <div className='space-y-1'>
                            <p className='text-sm'>
                                Drag and drop, or <span className='text-indigo-700'>browse</span> your files
                            </p>
                        </div>
                    </div>
                </div>
                {previews.length > 0 && (
                    <div className='flex-initial flex flex-col gap-2'>
                        <div className='text-sm font-medium'>
                            Preview
                        </div>
                        <div className='flex flex-row gap-2 flex-wrap'>
                            {previews.map((url: string) => (
                                <div key={url} className='h-24 w-24   relative '>
                                    <div className='absolute -top-1.5 -right-1.5 cursor-pointer' onClick={() => {
                                        handleRemoveImage(url)
                                    }}>
                                        <XCircle className='h-4 w-4 fill-red-500 stroke-foreground' />
                                    </div>
                                    <Image src={url} alt="reward gallery" className='object-contain rounded-sm  -z-10' fill unoptimized />

                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>

    )
}