'use client'
import { Button } from '@/components/ui/button'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter, DialogTrigger, DialogClose
} from '@/components/ui';
import React, { useEffect, useState } from 'react'
import Papa from 'papaparse';
import { FileDown, Loader2 } from 'lucide-react';
import { sleep, tryCatch } from '@/libs/utils';
import {
    Select, SelectTrigger,
    SelectContent, SelectItem, SelectValue,
    Label
} from '@/components/forms';
import { toast } from 'react-toastify';
import { useMemberPlans } from '@/hooks';
import Link from 'next/link';
import { MemberPlan } from '@/types';
import { ImportMemberForm, FieldMapping } from './';

const REQUIRED_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'lastRenewalDate'];

type FilePreviewType = {
    headers: string[];
    data: Record<string, string>[];
};

export function ImportMembers({ lid }: { lid: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const [file, setFile] = useState<File | undefined>(undefined);
    const [planId, setPlanId] = useState<number | null>(null);
    const [preview, setPreview] = useState<FilePreviewType | null>(null);
    const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<string[]>([]);
    const { plans } = useMemberPlans(lid);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setErrors([]);
        setPreview(null);
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            preview: 5,
            complete: (results) => {
                if (!results.meta.fields?.length || !results.data?.length) {
                    setErrors([`Invalid CSV: No ${!results.meta.fields?.length ? 'headers' : 'data'} found.`]);
                    return;
                }

                const headers = results.meta.fields as string[];
                const data = results.data as Record<string, string>[];
                setPreview({ headers, data });

            }
        });
    }, [file]);

    function handleOpenChange(open: boolean) {
        setOpen(open);
        setIsLoading(false);
        if (!open) {
            setFieldMapping({});
            setFile(undefined);
            setPreview(null);
        }
    }

    const isFormValid = () => {
        return preview && preview.data.length > 0 && Object.keys(fieldMapping).length === REQUIRED_FIELDS.length;
    }

    async function handleUpload() {
        if (!preview || preview.data.length === 0) {
            toast.error("No valid data to upload.");
            return;
        }

        // Check if all required fields are mapped
        const unmappedFields = REQUIRED_FIELDS.filter(field => !fieldMapping[field]);
        if (unmappedFields.length > 0) {
            setErrors(errors => [...errors, `Please map all required fields: ${unmappedFields.join(', ')}`]);
            return;
        }

        setIsLoading(true);
        const formData = new FormData();

        formData.append('file', file as File);
        formData.append('fieldMapping', JSON.stringify(fieldMapping));
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
            const data = await result?.json();
            setIsLoading(false);
            toast.error(data?.message || "Something went wrong, please try again later");
            return;
        }

        toast.success("Members uploaded successfully");
        handleOpenChange(false);
    }



    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="create" size="sm" className='rounded-lg'>
                    <FileDown className='size-4' /> Import Members
                </Button>
            </DialogTrigger>
            <DialogContent className='w-full max-w-lg md:rounded-lg p-0 gap-0 border-foreground/10'>
                {isLoading ? (
                    <div className='flex items-center justify-center text-sm py-8 h-full gap-2'>
                        <Loader2 className='size-4 animate-spin' /> Importing members
                        <span className='animate-pulse'>...</span>
                    </div>
                ) : (
                    <>
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
                                Any invalid email, phone, or renewal date will be skipped.
                            </DialogDescription>
                        </DialogHeader>
                        <div className='p-4  space-y-2'>

                            <ImportMemberForm file={file} setFile={setFile} />
                            {errors.length > 0 && (
                                <div className='space-y-1'>
                                    {errors.map((error, index) => (
                                        <p key={index} className="text-red-500 text-sm font-medium">{error}</p>
                                    ))}
                                </div>
                            )}

                            {file && preview && (
                                <div className='space-y-2'>
                                    <FieldMapping headers={preview.headers} fieldMapping={fieldMapping} setFieldMapping={setFieldMapping} />
                                    <div className='space-y-1'>
                                        <Label className='text-tiny uppercase font-medium'>Select a Plan</Label>
                                        <Select onValueChange={(value) => { setPlanId(Number(value)); console.log(value) }}>
                                            <SelectTrigger className='border-foreground/10'>
                                                <SelectValue placeholder="Select a Plan" />
                                            </SelectTrigger>
                                            <SelectContent className='border-foreground/10'>
                                                {plans.map((p: MemberPlan, index: number) => (
                                                    <SelectItem key={index} value={p.id?.toString() || ''}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <p className='text-xs text-yellow-400'>

                                        If no plan is selected, members will be added without a program or plan. You can assign one later.
                                    </p>
                                </div>
                            )}
                        </div>
                        <DialogFooter className='px-4 pb-4 pt-0 md:justify-between'>
                            <DialogClose asChild>
                                <Button variant="clear" size="sm" disabled={isLoading}>
                                    Cancel

                                </Button>
                            </DialogClose>
                            <Button variant="continue" size="sm" onClick={handleUpload}
                                disabled={!isFormValid() || isLoading}>
                                Import
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
