'use client'
import { Button } from '@/components/ui/button'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter, DialogTrigger, DialogClose,
    Table, TableRow, TableHeader, TableBody, TableCell
} from '@/components/ui';
import React, { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react'
import Papa from 'papaparse';
import { FileDown, FileIcon } from 'lucide-react';
import { cn, tryCatch } from '@/libs/utils';
import {
    Select, SelectTrigger,
    SelectContent, SelectItem, SelectValue
} from '@/components/forms';
import { toast } from 'react-toastify';
import { useMemberPlans } from '@/hooks';
import Link from 'next/link';

const FILE_TYPES = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, .csv";
const REQUIRED_HEADERS = ['first_name', 'last_name', 'email', 'phone', 'last_renewal_day'];

const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type FilePreviewType = {
    headers: string[];
    rows: Record<string, string>[];
};

export function ImportMembers({ lid }: { lid: string }) {
    const [file, setFile] = useState<File | undefined>(undefined);
    const [planId, setPlanId] = useState<Number | null>(null);
    const [preview, setPreview] = useState<FilePreviewType | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { plans } = useMemberPlans(lid);
    const [open, setOpen] = useState(false);

    useEffect(() => {

        setError(null);
        setPreview(null);

        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            preview: 5,
            complete: (results) => {
                if (!results.meta.fields?.length || !results.data?.length) {
                    setError(`Invalid CSV: No ${!results.meta.fields?.length ? 'headers' : 'data'} found.`);
                    return;
                }

                const headers = results.meta.fields as string[];
                const normalizedHeaders = headers.map(header => header.toLowerCase());
                const missingHeaders = REQUIRED_HEADERS.filter(header => !normalizedHeaders.includes(header));

                if (missingHeaders.length > 0) {
                    setError(`Missing headers: ${missingHeaders.join(', ')}`);
                    return;
                }


                const validationErrors: string[] = [];

                const validRows = results.data.filter((row: any, index) => {
                    if (!row.last_renewal_day.match(DATE_FORMAT_REGEX)) {
                        validationErrors.push(`Row ${index + 1}: Invalid date format (YYYY-MM-DD) for 'last_renewal_day'.`);
                        return false;
                    }
                    return true;
                });

                if (validationErrors.length > 0) {
                    setError(validationErrors.join("\n"));
                    return;
                }

                setPreview({
                    headers: headers,
                    rows: validRows as Record<string, any>[]
                });
            }
        });
    }, [file]);

    function handleOpenChange(open: boolean) {
        setOpen(open);
        if (!open) {
            setFile(undefined);
            setPreview(null);
        }
    }

    async function handleUpload() {
        if (!preview || preview.rows.length === 0) {
            toast.error("No valid data to upload.");
            return;
        }
        const formData = new FormData();

        formData.append('file', file as File);
        if (planId) {

            formData.append('planId', planId.toString());
        }
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/members/import`, {
                method: 'POST',
                body: formData,
            })
        );

        if (error || !result || !result.ok) {
            toast.error("Something went wrong, please try again later");
            return;
        }

        toast.success("Members uploaded successfully");
        setFile(undefined);
        setPreview(null);
    }



    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className='flex-1 items-center gap-1 rounded-sm bg-foreground/10 hover:bg-foreground/10' >
                    <FileDown className='size-4' /> Import Members
                </Button>
            </DialogTrigger>
            <DialogContent className='w-full max-w-2xl md:rounded-lg p-0 gap-0 border-foreground/10'>
                <DialogHeader className='space-y-1 px-4 pt-4 pb-0 group'>
                    <DialogTitle className='text-base font-medium'>
                        Import Members
                    </DialogTitle>
                    <DialogDescription className='text-sm'>
                        Upload a CSV file. Ensure the date format is YYYY-MM-DD.
                        Download the {' '}
                        <Link href={`/api/protected/loc/${lid}/members/import/template`} target='_blank'
                            className='text-red-500 font-medium hover:underline'>
                            CSV template
                        </Link> to see the required headers.
                    </DialogDescription>
                </DialogHeader>
                <div className='p-4 space-y-4'>
                    <ImportMemberForm file={file} setFile={setFile} />
                    {error && <p className="text-red-500 text-xs">{error}</p>}
                    {preview && <ImportPreview preview={preview} />}
                    {file && (
                        <div className='space-y-2'>
                            <SelectField data={plans} onChange={setPlanId} label="Select a Plan" />
                            <p className='text-xs text-yellow-400'>If no selection is made, members will be added without a program or plan. You can assign one later.</p>
                        </div>
                    )}
                </div>
                <DialogFooter className='p-4 md:justify-between'>
                    <DialogClose asChild>
                        <Button variant="clear" size="sm" className='rounded-xs'>Cancel</Button>
                    </DialogClose>
                    <Button variant="continue" size="sm" onClick={handleUpload} className='rounded-xs'
                        disabled={!file || !preview || preview.rows.length === 0 || !planId}>
                        Import
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

interface ImportMemberFormProps {
    file: File | undefined;
    setFile: Dispatch<SetStateAction<File | undefined>>;
}

function ImportMemberForm({ file, setFile }: ImportMemberFormProps) {
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
        <div onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            className={cn("flex h-48 cursor-pointer items-center justify-center rounded-md border border-dashed border-foreground/10 ", { "h-22": file })}
        >
            {file ? (
                <div className='flex flex-col items-center gap-2'>
                    <p className='flex text-xs items-center gap-1'>
                        <FileIcon className='size-4' />
                        <span className='truncate'>{file.name}</span>
                    </p>
                    <Button variant='outline' size='xs'
                        className='border-foreground/10'
                        onClick={(e) => {
                            e.stopPropagation();

                            setFile(undefined);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                        }}>
                        Remove
                    </Button>
                </div>
            ) : (
                <div className='space-y-1'>
                    <p className='text-sm'>Drag and drop, or <span className='text-indigo-500'>browse</span> your files</p>
                </div>
            )}
            <input ref={fileInputRef} type="file" className='hidden' onChange={handleFileChange} accept={FILE_TYPES} />
        </div>
    )
}

function ImportPreview({ preview }: { preview: FilePreviewType }) {
    return (
        <div className='space-y-1'>
            <p className='text-sm'>Preview members to be imported ({preview.rows.length} rows)</p>
            <div className='border rounded-sm overflow-hidden border-foreground/10 mt-2'>
                <Table className='max-w-full bg-foreground/5'>
                    <TableHeader>
                        <TableRow className='border-none'>
                            {preview.headers.slice(0, 5).map((header, index) => (
                                <TableCell key={index} className='text-xs font-medium'>{header}</TableCell>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {preview.rows.slice(0, 5).map((row, index) => (
                            <TableRow key={index}>
                                {preview.headers.slice(0, 5).map((header, cellIndex) => (
                                    <TableCell key={cellIndex} className='text-xs'>{row[header]}</TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

function SelectField({ label, data, onChange }: { label: string, data: Array<any>, onChange: Function }) {
    return (
        <div className='space-y-1'>
            <label className='text-tiny uppercase font-medium'>{label}</label>
            <Select onValueChange={(value) => { onChange(Number(value)); console.log(value) }}>
                <SelectTrigger className='border-foreground/10'>
                    <SelectValue placeholder={label} />
                </SelectTrigger>
                <SelectContent className='border-foreground/10'>
                    {data.map((d, index: number) => (
                        <SelectItem key={index} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
