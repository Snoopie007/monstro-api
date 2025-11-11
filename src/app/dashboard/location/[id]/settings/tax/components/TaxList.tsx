'use client';
import { Table, TableHeader, TableBody, TableCell, TableHead, TableRow, Badge } from "@/components/ui";
import { useTaxRates } from "../provider";
import TaxActions from "./TaxActions";
import { CheckIcon, X } from "lucide-react";
export function TaxList() {
    const { taxRates } = useTaxRates();
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    {["Name", "Country", "State", "Percentage", "Status", "Stripe", ""].map((header) => (
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
                        <TableCell>
                            {taxRate.stripeRateId ? <CheckIcon className="size-4 text-green-500" /> : <X className="size-4 text-red-500" />}
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