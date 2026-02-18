"use client";
import { Contract } from "@subtrees/types";
import ContractActions from "./ContractActions";
import { TableRow, TableCell, Button } from "@/components/ui";
import { format } from "date-fns";
import { Badge } from "@/components/ui";
import { usePermission } from "@/hooks/usePermissions";
export function ContractItem({ contract }: { contract: Contract }) {
    const lid = contract.locationId;
    const canEditContract = usePermission('edit contract', lid);
    const canDeleteContract = usePermission('delete contract', lid);
    return (
        <TableRow

            className="cursor-pointer"
        >
            <TableCell className="w-[200px]">
                <span className="truncate">

                    {contract.title ? contract.title : 'No Title'}
                </span>

            </TableCell>
            <TableCell >
                {format(contract.created, 'MM/dd/yyyy')}
            </TableCell>
            <TableCell >
                {contract.type}
            </TableCell>
            <TableCell >
                <Badge size="small"
                    variant={contract.isDraft ? "destructive" : "default"}>
                    {contract.isDraft ? "Draft" : "Active"}
                </Badge>
            </TableCell>

            <TableCell >
                <Badge size="small" variant="default">
                    {contract.editable ? "Editable" : "Not Editable"}
                </Badge>
            </TableCell>
            <TableCell>
                <Badge size="small" variant={contract.requireSignature ? "default" : "destructive"}>
                    {contract.requireSignature ? "Yes" : "No"}
                </Badge>
            </TableCell>
            <TableCell >
                <ContractActions contract={contract} lid={lid} />
            </TableCell>
        </TableRow>
    );
}
