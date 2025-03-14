import { Contract } from "@/types";
import { FormControl, FormLabel, FormDescription, FormField, FormItem, FormMessage } from "@/components/forms";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/forms";
import { tryCatch } from "@/libs/utils";
import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { NewPlanSchema } from "../../../../schemas";
import { z } from "zod";
import { Skeleton } from "@/components/ui";

interface SelectContractProps {
    lid: string,
    form: UseFormReturn<z.infer<typeof NewPlanSchema>>
}


export function SelectContract({ lid, form }: SelectContractProps) {
    const [contractsLoading, setContractsLoading] = useState(false);
    const [contracts, setContracts] = useState<Contract[]>([]);

    async function getContracts() {
        if (contractsLoading || contracts.length > 0) return
        setContractsLoading(true)
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/contracts?withDraft=false`)
        )
        setContractsLoading(false)
        if (error || !result || !result.ok) return
        const data = await result.json()
        setContracts(data)

    }

    return (
        <fieldset>
            <FormField
                control={form.control}
                name="contractId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel size={"tiny"}>Attach a Contract</FormLabel>
                        <FormDescription className="text-xs">Leave blank to not attach a contract.</FormDescription>
                        <Select onValueChange={(e) => field.onChange(parseInt(e))} onOpenChange={(open) => open && getContracts()}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a contract" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {contractsLoading ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-6 w-full" />
                                        <Skeleton className="h-6 w-full" />
                                    </div>
                                ) : contracts.length > 0 ? (
                                    contracts.map((contract: Contract) => (
                                        <SelectItem key={contract.id} value={`${contract.id}`}>
                                            <div className='flex flex-col items-start leading-none space-y-0 cursor-pointer'>
                                                <span className='text-xs font-medium'>{contract.title}</span>
                                                <span className='text-xs text-muted-foreground'>
                                                    {contract.description ?
                                                        `${contract.description.substring(0, 30)}...` :
                                                        "No description..."}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className='text-xs text-muted-foreground'>No contracts found</div>
                                )}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </fieldset>
    )
}
