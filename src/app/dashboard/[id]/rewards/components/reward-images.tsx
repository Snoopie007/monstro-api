
import Image from 'next/image'
import { cn } from '@/libs/utils'
import React from 'react'
import { XCircle } from 'lucide-react'

interface RewardImagesProps {
    value: string[]
    onFilesChange: (files: File[]) => void
}

export function RewardImages({ value, onFilesChange }: RewardImagesProps) {

    const [previews, setPreviews] = React.useState<Array<string>>(value || []);
    const inputRef = React.useRef<HTMLInputElement>(null);


    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (files) {
            const urls = Array.from(files).map((file) => URL.createObjectURL(file))
            setPreviews(urls)

            onFilesChange(Array.from(files));
        }
    }

    function handleDrop(e: React.DragEvent<HTMLInputElement>) {
        if (previews.length > 0) return;
        e.preventDefault();
        const droppedFiles = e.dataTransfer.files;
        if (e.dataTransfer.files.length > 1 || !droppedFiles[0]) return;
        const urls = Array.from(droppedFiles).map((file) => URL.createObjectURL(file))
        handleFileChange({ target: { files: droppedFiles } } as React.ChangeEvent<HTMLInputElement>)
    }

    function handleRemoveImage(url: string) {
        setPreviews(previews.filter(p => p !== url));
    }

    return (
        <div className='flex flex-col gap-4'>
            <div className='flex-initial'>
                <input ref={inputRef} type='file' multiple className={cn("hidden")}
                    onInput={handleFileChange}
                    accept='image/*'
                />
                <div
                    onClick={() => inputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(event) => event.preventDefault()}
                    className='flex h-32 cursor-pointer items-center justify-center rounded-md border border-dashed border-strong'
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
                    {previews.map((url: string) => (
                        <div key={url} className='h-24 w-24   relative '>
                            <div className='absolute -top-1.5 -right-1.5 cursor-pointer' onClick={() => {
                                handleRemoveImage(url)
                            }}>
                                <XCircle className='h-4 w-4 fill-red-500 stroke-foreground' />
                            </div>
                            <Image
                                src={url}
                                alt="reward gallery"
                                className='object-contain rounded-sm  -z-10'
                                fill
                                unoptimized
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>

    )
}