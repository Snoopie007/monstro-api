'use client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'

import React, { useEffect, useRef, useState } from 'react'
import Papa from 'papaparse';

import { FileDown, FileIcon, FileUp } from 'lucide-react';
import { cn, sleep } from '@/libs/utils';

import { Table, TableRow, TableHeader, TableBody, TableCell } from '@/components/ui';
import { Progress } from '@/components/ui/progress';
import { toast } from 'react-toastify';

const fileTypes = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, .csv";

export default function ImportMembers({ locationId }: { locationId: string }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | undefined>(undefined);
    const [preview, setPreview] = useState<{ headers: string[], rows: Record<string, string>[] } | null>(null);
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

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        setFile(e.target.files?.[0]);
    }


    function handleDrop(e: React.DragEvent<HTMLInputElement>) {
        if (file) return;
        e.preventDefault();
        const droppedFiles = e.dataTransfer.files;
        if (e.dataTransfer.files.length > 1 || !droppedFiles[0]) return;
        setFile(droppedFiles[0]);
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant={"ghost"} size={"icon"} className='h-auto py-1 text-xs rounded-xs border'>
                    <FileDown size={16} />
                </Button>
            </DialogTrigger>
            <DialogContent className='w-full max-w-4xl rounded-xs p-0  gap-0'>
                <DialogHeader className='space-y-1 px-4 py-2 '>
                    <DialogTitle className='text-base font-medium'>Import Members</DialogTitle>
                    <DialogDescription className='text-xs'>Upload a CSV file. The first row should be the headers of the table, and your headers should not include any special characters other than hyphens (-) or underscores (_).

                        Tip: Datetime columns should be formatted as YYYY-MM-DD HH:mm:ss</DialogDescription>
                </DialogHeader>
                <div className='py-4'>
                    <div className='px-4'>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={(event) => event.preventDefault()}
                            className={cn("flex h-48 cursor-pointer items-center justify-center rounded-md border border-dashed border-strong ", {
                                "h-24": file,
                            })}
                        >
                            {file ? (
                                <div className='flex flex-col items-center justify-center gap-2'>
                                    <p className='flex text-sm items-center gap-2'><FileIcon size={14} />{file.name}</p>
                                    <Button variant='outline' size='sm'
                                        className="rounded-xs border-foreground  text-xs h-auto py-1"
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
                            <input
                                ref={fileInputRef}
                                type="file"
                                className='hidden'
                                onChange={handleFileChange}
                                accept={fileTypes}
                            />

                        </div>
                    </div>

                    {preview && (
                        <div className='mt-4  p-4'>
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
                                                    <TableCell key={cellIndex} className='text-xs py-2 px-2'>
                                                        {String(row[header]).length > 20 ? `${String(row[header]).substring(0, 20)}...` : row[header]}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>


                        </div>
                    )}
                </div>
                <DialogFooter>

                </DialogFooter>
            </DialogContent>

        </Dialog>
    )
}
