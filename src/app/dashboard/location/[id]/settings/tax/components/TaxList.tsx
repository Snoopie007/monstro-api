'use client';
import { Table, TableHeader, TableBody, TableCell, TableHead, TableRow } from "@/components/ui";
import { useTaxRates } from "../provider/TaxRateProvider";
export function TaxList() {
    const { taxRates } = useTaxRates();
    return (
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
                        <TableCell>{taxRate.name}</TableCell>
                        <TableCell>{taxRate.country}</TableCell>
                        <TableCell>{taxRate.state}</TableCell>
                        <TableCell>{taxRate.percentage}</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}