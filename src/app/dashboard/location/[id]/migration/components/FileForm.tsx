'use client'

import { Dispatch, SetStateAction, useRef } from "react";
import { FileIcon } from "lucide-react";
import { Button } from "@/components/ui";
import { XIcon } from "lucide-react";
import { cn } from "@/libs/utils";

interface ImportMemberFormProps {
    file: File | undefined;
    setFile: Dispatch<SetStateAction<File | undefined>>;
}

const FILE_TYPES = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, .csv";
export function ImportMemberForm({ file, setFile }: ImportMemberFormProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleDrop(e: React.DragEvent<HTMLInputElement>) {
        e.preventDefault();
        if (file) return;
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles.length === 1) {
            setFile(droppedFiles[0]);
        }
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) setFile(selectedFile);
    }

    return (
        <>
            {file ? (
                <div className='flex flex-row items-center  justify-between bg-foreground/5 rounded-sm px-3 py-2'>
                    <p className='flex text-xs items-center gap-1'>
                        <FileIcon className='size-3.5' />
                        <span className='truncate'>{file.name}</span>
                    </p>
                    <Button
                        variant='ghost'
                        size='icon'
                        className='border-foreground/10 rounded-lg size-6 hover:bg-foreground/10 '
                        onClick={(e) => {
                            e.stopPropagation();
                            setFile(undefined);
                            if (fileInputRef.current) fileInputRef.current.value = '';
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
                    className={cn("flex h-40 cursor-pointer items-center justify-center rounded-md border border-dashed border-foreground/10", { "h-22": file })}
                >
                    <div className='space-y-1'>
                        <p className='text-sm'>
                            Drag and drop, or <span className='text-indigo-500'>browse</span> your files
                        </p>
                    </div>
                </div>
            )}
            <input
                ref={fileInputRef}
                type="file"
                className='hidden'
                onChange={handleFileChange}
                accept={FILE_TYPES}
            />
        </>
    )
}

