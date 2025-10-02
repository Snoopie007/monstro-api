import { Popover, PopoverTrigger, PopoverContent, Button, Input, SelectValue, SelectTrigger, Select, SelectItem, SelectContent, Separator } from "@/components/ui";
import { ColumnDef } from "@/libs/table-utils";
import { FilterIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { MemberWithCustomFieldsColumns } from "../MemberColumns";

interface FilterPopoverProps {
    columns: ColumnDef<MemberWithCustomFieldsColumns, any>[];
    filters: { id: string, value: unknown }[];
    onFiltersChange: (filters: { id: string, value: unknown }[]) => void;
}

export function FilterPopover({ columns, filters, onFiltersChange }: FilterPopoverProps) {
    const columnOptions = columns
    .filter((column: ColumnDef<MemberWithCustomFieldsColumns, any> & { accessorKey?: string }) => column.id !== 'select' && column.accessorKey !== 'tags')
    .map((column: ColumnDef<MemberWithCustomFieldsColumns, any> & { accessorKey?: string }) => {
        const {accessorKey, id, header} = column;
        return {
            id: accessorKey ?? id ?? 'name',
            label: header
        }
    })

    const [filterKv, setFilterKv] = useState<{ id: string, value: unknown }[]>([{ id: columnOptions[0].id, value: "" }]);

    const handleColumnChange = (currentId: string, newColumnId: string) => {
        setFilterKv(filterKv.map(filter => filter.id === currentId ? { ...filter, id: newColumnId } : filter))
    }

    const handleValueChange = (id: string, value: string) => {
        setFilterKv(filterKv.map(filter => filter.id === id ? { ...filter, value } : filter))
    }

    const handleRemoveFilter = (id: string) => {
        setFilterKv(filterKv.filter(filter => filter.id !== id))
    }

    const handleApplyFilters = (filters: { id: string, value: unknown }[]) => {
        // sync filters to parent
        onFiltersChange(filters)
    }

    useEffect(() => {
        if (filters.length > 0) {
            setFilterKv(filters)
        }
    }, [filters])

	return (
		<Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="hover:bg-foreground/10">
                    <FilterIcon size={14} className="mr-2" />
                    Filter
                </Button>
            </PopoverTrigger>
            <PopoverContent className="min-w-96 max-w-96 p-2 border-foreground/10 overflow-hidden space-y-2" align="start">
                {filterKv.map((kv, index) => (
                    <div className="flex flex-row items-center gap-2" key={index}>
                        <Select value={kv.id} onValueChange={(value) => handleColumnChange(kv.id, value)}>
                            <SelectTrigger className="w-full h-7 text-sm">
                                <SelectValue placeholder="Select Column" />
                            </SelectTrigger>
                            <SelectContent>
                                {columnOptions.map((option, index) => (
                                    <SelectItem value={option.id} key={index}><span>
                                        {option.label as string}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <span>is </span>
                        <Input className="h-7 text-sm" value={String(kv.value || "")} onChange={(e) => handleValueChange(kv.id, e.target.value)} />
                        <Button variant="ghost" size="icon" className="size-5 p-1" onClick={() => handleRemoveFilter(kv.id)}>
                            <XIcon size={14} />
                        </Button>
                    </div>
                ))}

                {filterKv.length > 0 && <Separator className="my-2" />}
                <div className="flex flex-row justify-between">
                <Button variant="create" size="sm" onClick={() => setFilterKv([...filterKv, { id: "", value: "" }])}>
                    Add Filter
                </Button>
                <Button variant="clear" size="sm" onClick={() => handleApplyFilters(filterKv)}>Apply Filters</Button>
                </div>
            </PopoverContent>
        </Popover>
	);
}