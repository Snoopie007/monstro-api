'use client'
import {
    Button, Table, TableHeader, TableBody, TableCell, TableHead, TableRow,
} from '@/components/ui'
import { cn, sleep, tryCatch } from '@/libs/utils';
import React, { useEffect, useState } from 'react'

import { Input } from '@/components/forms';
import { TaxRate } from '@/types';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import { useTaxRate } from '../providers';


interface TaxRateProps {
    lid: string;
}

export function TaxRateList({ lid }: TaxRateProps) {
    const { taxRates } = useTaxRate();
    const [loading, setLoading] = useState(false);





    return (
        <div className='space-y-4'>
            <Table>
                <TableHeader>
                    <TableRow>
                        {["Name", "Country", "State", "Percentage", ""].map((header) => (
                            <TableHead key={header}>{header}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {taxRates.map((taxRate, index) => (
                        <TableRow key={index}>
                            <TableCell>
                                {taxRate.name}
                            </TableCell>
                            <TableCell>
                                {taxRate.country}
                            </TableCell>
                            <TableCell>
                                {taxRate.state}
                            </TableCell>
                            <TableCell>
                                {taxRate.percentage}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
