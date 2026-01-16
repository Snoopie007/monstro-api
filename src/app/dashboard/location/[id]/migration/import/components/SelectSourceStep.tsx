'use client'

import { useRef } from 'react'
import { FileSpreadsheet, Zap, FileIcon, XIcon, CheckIcon } from 'lucide-react'
import { cn } from '@/libs/utils'
import { Badge, Button } from '@/components/ui'
import type { ImportSource } from './ImportStepperPage'

interface SelectSourceStepProps {
    importSource: ImportSource
    onSourceSelect: (source: ImportSource) => void
    file: File | undefined
    onFileChange: (file: File | undefined) => void
}

const FILE_TYPES = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, .csv'

export function SelectSourceStep({
    importSource,
    onSourceSelect,
    file,
    onFileChange,
}: SelectSourceStepProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)

    function handleDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault()
        if (file) return
        const droppedFiles = e.dataTransfer.files
        if (droppedFiles.length === 1) {
            onFileChange(droppedFiles[0])
        }
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) onFileChange(selectedFile)
    }

    const sources = [
        {
            id: 'csv' as const,
            name: 'CSV File',
            description: 'Upload a CSV or Excel file with your member data',
            icon: FileSpreadsheet,
            enabled: true,
        },
        {
            id: 'gohighlevel' as const,
            name: 'GoHighLevel',
            description: 'Import members directly from your GoHighLevel account',
            icon: Zap,
            enabled: false,
        }
    ]

    return (
        <div className='space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {sources.map((source) => (
                    <button
                        key={source.id}
                        type='button'
                        disabled={!source.enabled}
                        onClick={() => source.enabled && onSourceSelect(source.id)}
                        className={cn(
                            'relative flex flex-col items-start p-4 rounded-lg border text-left transition-all',
                            source.enabled
                                ? 'cursor-pointer hover:bg-foreground/5'
                                : 'cursor-not-allowed opacity-60',
                            importSource === source.id
                                ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2 ring-offset-background'
                                : 'border-foreground/10'
                        )}
                    >
                        {!source.enabled ? (
                            <Badge variant='secondary' className='absolute top-2 right-2 text-xs'>
                                Coming Soon
                            </Badge>
                        ) : null}
                        {importSource === source.id ? (
                            <div className='absolute top-2 right-2'>
                                <CheckIcon className='size-4 text-primary' />
                            </div>
                        ) : null}
                        <source.icon className='size-8 mb-3 text-muted-foreground' />
                        <div className='font-medium'>{source.name}</div>
                        <div className='text-sm text-muted-foreground mt-1'>
                            {source.description}
                        </div>
                    </button>
                ))}
            </div>

            {importSource === 'csv' ? (
                <div className='space-y-3'>
                    <div className='text-sm font-medium'>Upload your file</div>
                    {file ? (
                        <div className='flex flex-row items-center justify-between bg-foreground/5 rounded-lg px-4 py-3 border border-foreground/10'>
                            <p className='flex text-sm items-center gap-2'>
                                <FileIcon className='size-4 text-muted-foreground' />
                                <span className='truncate'>{file.name}</span>
                            </p>
                            <Button
                                variant='ghost'
                                size='icon'
                                className='rounded-lg size-8 hover:bg-foreground/10'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onFileChange(undefined)
                                    if (fileInputRef.current) fileInputRef.current.value = ''
                                }}
                            >
                                <XIcon className='size-4' />
                            </Button>
                        </div>
                    ) : (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={(event) => event.preventDefault()}
                            className='flex h-40 cursor-pointer items-center justify-center rounded-lg border border-dashed border-foreground/20 hover:border-foreground/40 transition-colors'
                        >
                            <div className='text-center space-y-2'>
                                <FileSpreadsheet className='size-8 mx-auto text-muted-foreground' />
                                <p className='text-sm'>
                                    Drag and drop, or{' '}
                                    <span className='text-primary font-medium'>browse</span> your files
                                </p>
                                <p className='text-xs text-muted-foreground'>
                                    Supports CSV, XLS, XLSX
                                </p>
                            </div>
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type='file'
                        className='hidden'
                        onChange={handleFileChange}
                        accept={FILE_TYPES}
                    />
                </div>
            ) : null}
        </div>
    )
}
