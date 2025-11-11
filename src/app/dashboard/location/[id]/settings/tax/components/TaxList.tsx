'use client';
import { Table, TableHeader, TableBody, TableCell, TableHead, TableRow, Badge } from "@/components/ui";
import { useTaxRates } from "../provider/TaxRateProvider";
import TaxActions from "./TaxActions";
export function TaxList() {
    const { taxRates } = useTaxRates();
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    {["Name", "Country", "State", "Percentage", "Status", ""].map((header) => (
                        <TableHead key={header}>{header}</TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {taxRates.map((taxRate, index) => (
                    <TableRow key={index}>
                        <TableCell>
                            <div className="flex flex-row gap-3 items-center">
                                {taxRate.name}
                                {taxRate.isDefault &&
                                    <Badge variant="default" className="-mt-0.5">Default</Badge>
                                }
                            </div>
                        </TableCell>
                        <TableCell>{taxRate.country}</TableCell>
                        <TableCell>{taxRate.state}</TableCell>
                        <TableCell>{taxRate.percentage}%</TableCell>
                        <TableCell>
                            <Badge variant={taxRate.status === "active" ? "success" : "error"} >{taxRate.status}</Badge>
                        </TableCell>
                        <TableCell className="flex justify-end">
                            <TaxActions taxRate={taxRate} />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}