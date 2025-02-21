'use client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog'

import React, { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react'
import Papa from 'papaparse';

import { FileDown, FileIcon, FileUp } from 'lucide-react';
import { cn, sleep } from '@/libs/utils';

import { Table, TableRow, TableHeader, TableBody, TableCell } from '@/components/ui';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/forms/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/forms/select';

const fileTypes = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, .csv";

type FilePreviewType = {
    headers: string[];
    rows: Record<string, string>[];
}

export default function ImportMembers({ locationId }: { locationId: string }) {
    const [step, setStep] = useState(0);
    const [file, setFile] = useState<File | undefined>(undefined);
    const [preview, setPreview] = useState<FilePreviewType | null>(null);
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (file) {
            // let lineCount = 0;
            // const totalLines = 5;
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                preview: 5,
                complete: function (results) {
                    setPreview({
                        headers: results.meta.fields as string[],
                        rows: results.data as Record<string, any>[]
                    });
                }
                // step: function (row, parser) {
                //     lineCount++;
                //     setPreview((currentPreview) => {
                //         const data = row.data as Record<string, any>;
                //         return currentPreview ? {
                //             headers: currentPreview.headers,
                //             rows: [...currentPreview.rows, data]
                //         } : {
                //             headers: row.meta.fields as string[],
                //             rows: [data]
                //         };
                //     });
                //     setProgress((lineCount / totalLines) * 100);
                // }
            });
        }
    }, [file]);

    function next() {
        setStep(step + 1);
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant={"ghost"} size={"icon"} className='h-auto py-1 text-xs rounded-xs border'>
                    <FileDown size={16} />
                </Button>
            </DialogTrigger>
            <DialogContent className='w-full max-w-2xl rounded-xs p-0  gap-0 '>
                <DialogHeader className='space-y-1 px-4 pt-4 pb-0 group' data-step={step}>
                    <DialogTitle className='text-base font-medium'>
                        <span className='text-base  font-medium group-data-[step=0]:block hidden'>Import Members</span>
                        <span className='text-sm  font-medium group-data-[step=1]:block hidden'>Enroll Members (Optional)</span>
                    </DialogTitle>
                    <DialogDescription className='text-xs '>
                        <span className='group-data-[step=0]:block hidden'>
                            Upload a CSV file. The first row should be the headers of the table, and your headers should not include any special characters other than hyphens (-) or underscores (_).
                            Tip: Datetime columns should be formatted as YYYY-MM-DD HH:mm:ss
                        </span>
                        <span className='group-data-[step=1]:block hidden'>
                            You can optionally bulk enroll members in a program and plan.
                            An invitation email will be sent to the members to ask them to update their details other wise their plan will be deactivated on the next billing date.
                        </span>
                    </DialogDescription>

                </DialogHeader>
                <div className='p-4 group  space-y-4' data-step={step}>

                    <div className=' group-data-[step=0]:block hidden'>
                        <ImportMemberForm file={file} setFile={setFile} setPreview={setPreview} />

                    </div>
                    {preview && (
                        <ImportPreview preview={preview} />
                    )}
                    <div className=' group-data-[step=1]:block hidden  space-y-2'>
                        <div className='space-y-1'>
                            <label className='text-tiny uppercase font-medium'>Select a Program</label>
                            <Select  >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a program" />
                                </SelectTrigger>
                                <SelectContent>

                                </SelectContent>
                            </Select>
                        </div>
                        <div className='space-y-1'>
                            <label className='text-tiny uppercase font-medium'>Select a Plan</label>
                            <Select  >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a plan" />
                                </SelectTrigger>
                                <SelectContent>

                                </SelectContent>
                            </Select>
                        </div>
                        <p className='text-xs text-yellow-400'>If you don't select a program and plan, the members will be added without any program or plan. However, you can always enroll them in a program and plan later.</p>

                    </div>

                </div>
                <DialogFooter className='border-t border-foreground/10 px-4 py-4'>
                    <DialogClose asChild>
                        <Button variant={"clear"} size={"sm"} className='rounded-xs'>Cancel</Button>
                    </DialogClose>
                    <Button variant={"continue"} size={"sm"} onClick={() => next()} className='rounded-xs'>
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
    setPreview: Dispatch<SetStateAction<FilePreviewType | null>>;
}

function ImportMemberForm({ file, setFile, setPreview }: ImportMemberFormProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    function handleDrop(e: React.DragEvent<HTMLInputElement>) {
        if (file) return;
        e.preventDefault();
        const droppedFiles = e.dataTransfer.files;
        if (e.dataTransfer.files.length > 1 || !droppedFiles[0]) return;
        setFile(droppedFiles[0]);
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        setFile(e.target.files?.[0]);
    }


    return (
        <div onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            className={cn("flex h-48 cursor-pointer items-center justify-center rounded-md border border-dashed border-strong ", {
                "h-28": file,
            })}
        >
            {file ? (
                <div className='flex flex-col items-center justify-center gap-2'>
                    <p className='flex text-xs items-center gap-2'><FileIcon size={14} />{file.name}</p>
                    <Button variant='outline' size='xs'
                        onClick={(e) => {
                            e.stopPropagation();
                            setFile(undefined);
                            setPreview(null);
                            if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                            }
                        }}>
                        Remove File
                    </Button>

                </div>

            ) : (
                <div className='space-y-1'>
                    <p className='text-sm'>Drag and drop, or <span className='text-indigo-700'>browse</span> your files</p>
                    {/* {progress > 0 && <Progress value={progress} className='h-1  ' />} */}
                </div>

            )}
            <input ref={fileInputRef} type="file" className='hidden' onChange={handleFileChange}
                accept={fileTypes}
            />

        </div>
    )
}


function ImportPreview({ preview }: { preview: FilePreviewType }) {
    return (
        <div className=''>
            <div className='space-y-0 mb-2 px-1'>
                <div className='text-sm font-medium'>Preview members to be imported</div>
                <p className='text-xs'>
                    A total of {preview.rows.length} members will be added.
                </p>

            </div>
            <div className='border rounded-sm overflow-hidden border-foreground/10'>

                <Table className='max-w-full bg-foreground/5 '>
                    <TableHeader>
                        <TableRow className="truncate py-1 ">
                            {preview.headers.slice(0, 5).map((header, index) => (
                                <TableCell key={index} className='text-xs py-2.5 px-2 font-medium'>{header.length > 20 ? `${header.substring(0, 20)}...` : header}</TableCell>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {preview.rows.slice(0, 5).map((row, index) => (
                            <TableRow key={index} className='truncate'>
                                {preview.headers.slice(0, 5).map((header, cellIndex) => (
                                    <TableCell key={cellIndex} className='text-xs py-1.5 px-2'>
                                        {String(row[header]).length > 20 ? `${String(row[header]).substring(0, 20)}...` : row[header]}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>


        </div>
    )
}
