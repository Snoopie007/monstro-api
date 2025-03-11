'use client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import React, { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react'
import Papa from 'papaparse';
import { FileDown, FileIcon } from 'lucide-react';
import { cn, tryCatch } from '@/libs/utils';
import { Table, TableRow, TableHeader, TableBody, TableCell } from '@/components/ui';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/forms/select';
import { toast } from 'react-toastify';
import { usePrograms } from '@/hooks/use-programs';
import { Program } from '@/types';


const fileTypes = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, .csv";

type FilePreviewType = {
    headers: string[];
    rows: Record<string, string>[];
};

export default function ImportMembers({ lid }: { lid: string }) {
    const [step, setStep] = useState(0);
    const [file, setFile] = useState<File | undefined>(undefined);
    const [programId, setProgramId] = useState<Number | null>(null);
    const [planId, setPlanId] = useState<Number | null>(null);
    const [preview, setPreview] = useState<FilePreviewType | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { data: programs, isLoading: programIsLoading } = usePrograms(lid);

    const requiredHeaders = ['first_name', 'last_name', 'email', 'phone', 'last_renewal_day', 'terms', 'term_count', 'status'];
    const normalizedRequiredHeaders = requiredHeaders.map(header => header.toLowerCase());
    const validTerms = ['month', 'week', 'year', 'day'];
    const validStatus = ['active', 'in active'];
    const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;

    useEffect(() => {
        if (!file) return;

        setError(null);
        setPreview(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            preview: 5,
            complete: (results) => {
                if (!results.meta.fields || results.meta.fields.length === 0) {
                    setError("Invalid CSV: No headers found.");
                    return;
                }
                if (!Array.isArray(results.data) || results.data.length === 0) {
                    setError("Invalid CSV: No data found.");
                    return;
                }

                const headers = results.meta.fields as string[];
                const normalizedHeaders = headers.map(header => header.toLowerCase());
                const missingHeaders = normalizedRequiredHeaders.filter(header => !normalizedHeaders.includes(header));

                if (missingHeaders.length > 0) {
                    setError(`Missing headers: ${missingHeaders.join(', ')}`);
                    return;
                }


                const validationErrors: string[] = [];

                const validRows = results.data.filter((row: any, index) => {
                    if (!row.last_renewal_day.match(dateFormatRegex)) {
                        validationErrors.push(`Row ${index + 1}: Invalid date format (YYYY-MM-DD) for 'last_renewal_day'.`);
                        return false;
                    }
                    if (!validTerms.includes(row.terms.toLowerCase())) {
                        validationErrors.push(`Row ${index + 1}: 'terms' must be one of [${validTerms.join(', ')}].`);
                        return false;
                    }
                    if (isNaN(Number(row.term_count))) {
                        validationErrors.push(`Row ${index + 1}: 'term_count' must be a number.`);
                        return false;
                    }
                    if (!validStatus.includes(row.status.toLowerCase())) {
                        validationErrors.push(`Row ${index + 1}: 'status' must be either 'active' or 'inactive'.`);
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

                next();
            }
        });
    }, [file]);

    async function handleUpload() {
        if (!preview || preview.rows.length === 0) {
            toast.error("No valid data to upload.");
            return;
        }
        const formData = new FormData();

        formData.append('file', file as File);
        if (programId && planId) {
            formData.append('programId', programId.toString());
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
        setStep(0);
    }


    function next() {
        setStep(step + 1);
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className='h-auto py-1 text-xs rounded-xs border'>
                    <FileDown size={16} />
                </Button>
            </DialogTrigger>
            <DialogContent className='w-full max-w-2xl rounded-xs p-0 gap-0'>
                <DialogHeader className='space-y-1 px-4 pt-4 pb-0 group' data-step={step}>
                    <DialogTitle className='text-base font-medium'>
                        {step === 0 ? "Import Members" : "Enroll Members (Optional)"}
                    </DialogTitle>
                    <DialogDescription className='text-xs'>
                        {step === 0
                            ? "Upload a CSV file. Ensure the date format is YYYY-MM-DD, 'terms' contains valid values, 'term_count' is a number, and 'status' is either 'active' or 'inactive'. Required headers: first_name, last_name, email, phone, last_renewal_day, terms, term_count, status. if you violate   any rules, the import will fail."
                            : "You can optionally bulk enroll members in a program and plan. If not selected, members can be assigned a plan later."}
                    </DialogDescription>
                </DialogHeader>
                <div className='p-4 space-y-4' data-step={step}>
                    {step === 0 && <ImportMemberForm file={file} setFile={setFile} />}
                    {error && <p className="text-red-500 text-xs">{error}</p>}
                    {preview && <ImportPreview preview={preview} />}
                    {step === 1 && (
                        <div className='space-y-2'>
                            <SelectField data={programs.filter((p: Program) => p.plans.length)} onChange={setProgramId} label="Select a Program" />
                            {programId &&
                                <SelectField data={programs.find((p: Program) => p.id == programId).plans} onChange={setPlanId} label="Select a Plan" />
                            }
                            <p className='text-xs text-yellow-400'>If no selection is made, members will be added without a program or plan. You can assign one later.</p>
                        </div>
                    )}
                </div>
                <DialogFooter className='border-t border-foreground/10 px-4 py-4'>
                    <DialogClose asChild>
                        <Button variant="clear" size="sm" className='rounded-xs'>Cancel</Button>
                    </DialogClose>
                    <Button variant="continue" size="sm" onClick={handleUpload} className='rounded-xs'>
                        {step === 0 ? "Continue" : "Upload"}
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
            className={cn("flex h-48 cursor-pointer items-center justify-center rounded-md border border-dashed border-strong", { "h-28": file })}
        >
            {file ? (
                <div className='flex flex-col items-center gap-2'>
                    <p className='flex text-xs items-center gap-2'><FileIcon size={14} />{file.name}</p>
                    <Button variant='outline' size='xs' onClick={(e) => {
                        e.stopPropagation();
                        setFile(undefined);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    }}>Remove File</Button>
                </div>
            ) : (
                <div className='space-y-1'>
                    <p className='text-sm'>Drag and drop, or <span className='text-indigo-700'>browse</span> your files</p>
                </div>
            )}
            <input ref={fileInputRef} type="file" className='hidden' onChange={handleFileChange} accept={fileTypes} />
        </div>
    )
}

function ImportPreview({ preview }: { preview: FilePreviewType }) {
    return (
        <div>
            <p className='text-sm font-medium'>Preview members to be imported ({preview.rows.length} rows)</p>
            <div className='border rounded-sm overflow-hidden border-foreground/10'>
                <Table className='max-w-full bg-foreground/5'>
                    <TableHeader>
                        <TableRow>
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
                <SelectTrigger>
                    <SelectValue placeholder={label} />
                </SelectTrigger>
                <SelectContent>
                    {data.map((d, index: number) => (
                        <SelectItem key={index} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
