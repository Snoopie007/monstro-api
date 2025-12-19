'use client'

import { Button } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/forms';
import { PlusIcon } from 'lucide-react';
import { Dispatch, SetStateAction } from 'react';

interface FieldMappingProps {
    headers: string[];
    fieldMapping: Record<string, string>;
    setFieldMapping: Dispatch<SetStateAction<Record<string, string>>>;
}

const fields = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'lastRenewalDate', label: 'Last Renewal Date' }
];

export function FieldMapping({ headers, fieldMapping, setFieldMapping }: FieldMappingProps) {

    return (
        <div className='space-y-1'>
            <div className='flex flex-row items-center justify-between'>
                <div className='text-sm'>Map your fields to the following headers</div>
                <Button variant='ghost' size='icon' className='size-5 rounded-sm hover:bg-foreground/10'>
                    <PlusIcon className='size-3.5' />
                </Button>
            </div>
            <div className='bg-foreground/5 rounded-sm px-4 py-2 space-y-2'>
                {fields.map((field) => (
                    <div key={field.key} className='flex flex-row items-center'>
                        <div className='text-xs font-medium flex-1'>{field.label}</div>
                        <div className='flex-1'>
                            <Select
                                value={fieldMapping[field.key]}
                                onValueChange={(value) => {
                                    setFieldMapping({ ...fieldMapping, [field.key]: value })
                                }}>
                                <SelectTrigger className='border-foreground/10 h-8 text-xs'>
                                    <SelectValue placeholder="Select a field" />
                                </SelectTrigger>
                                <SelectContent>
                                    {headers.map((header, index) => (
                                        <SelectItem key={index} value={header}>{header}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

