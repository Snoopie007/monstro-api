import { Popover, PopoverTrigger, PopoverContent, Button } from "@/components/ui";
import { ColumnDef } from "@/libs/table-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/forms";
import { FilterIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { FilterInputType, memberColumnMetadata, getCustomFieldConfig } from "./ColumnTypes";
import { CustomFieldDefinition, MemberListItem } from "@/types";
import { FilterInput } from "./FilterInput";

interface FilterPopoverProps {
    columns: ColumnDef<MemberListItem, any>[];
    filters: { id: string, value: unknown }[];
    onFiltersChange: (filters: { id: string, value: unknown }[]) => void;
    customFields?: CustomFieldDefinition[];
}

export function FilterPopover({ columns, filters, onFiltersChange, customFields }: FilterPopoverProps) {

    // Generate column options with metadata
    const columnOptions = columns
        .filter((column: ColumnDef<MemberListItem, any> & { accessorKey?: string }) =>
            column.id !== 'select' && column.accessorKey !== 'tags')
        .map((column: ColumnDef<MemberListItem, any> & { accessorKey?: string }) => {
            const { accessorKey, id, header } = column;
            const columnId = accessorKey ?? id ?? 'name';

            // Check if this is a custom field column
            if (columnId.startsWith('custom-field-')) {
                const fieldId = columnId.replace('custom-field-', '');
                const customFieldConfig = getCustomFieldConfig(fieldId, customFields);

                if (customFieldConfig) {
                    return {
                        id: columnId,
                        label: header,
                        inputType: customFieldConfig.inputType,
                        options: customFieldConfig.options,
                        placeholder: customFieldConfig.placeholder
                    };
                }
            }

            // Handle regular columns
            const metadata = memberColumnMetadata[columnId];
            return {
                id: columnId,
                label: header,
                inputType: metadata?.inputType || FilterInputType.TEXT,
                options: metadata?.options,
                placeholder: metadata?.placeholder || `Enter ${header?.toString().toLowerCase()}`
            };
        });

    const allColumnOptions = columnOptions;

    const [filterKv, setFilterKv] = useState<{ id: string, value: unknown }[]>([{ id: allColumnOptions[0]?.id || '', value: "" }]);

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
                <Button variant="ghost" className="hover:bg-foreground/10">
                    <FilterIcon size={14} className="mr-2" />
                    Filter
                    {filterKv.length > 0 &&
                        <span className="text-xs text-foreground/80 ml-2 size-5 flex items-center justify-center bg-foreground/10 rounded-full">
                            {filterKv.length}
                        </span>
                    }
                </Button>
            </PopoverTrigger>
            <PopoverContent className="min-w-96 max-w-96 space-y-4 p-3 border-foreground/10 overflow-hidden " align="start">
                <div className="space-y-2">
                    {filterKv.map((kv, index) => {
                        const selectedColumn = allColumnOptions.find(option => option?.id === kv.id);
                        const inputType = selectedColumn?.inputType || FilterInputType.TEXT;
                        const options = selectedColumn?.options;
                        const placeholder = selectedColumn?.placeholder;
                        return (
                            <div className="flex flex-row items-center gap-2" key={index}>
                                <Select value={kv.id} onValueChange={(value) => handleColumnChange(kv.id, value)}>
                                    <SelectTrigger className="w-full h-7 text-sm">
                                        <SelectValue placeholder="Select Column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allColumnOptions.filter((option): option is NonNullable<typeof option> => Boolean(option)).map((option, index) => (
                                            <SelectItem value={option.id} key={index}>
                                                {option.label as string}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span className="text-sm">is</span>
                                <FilterInput
                                    columnId={kv.id}
                                    value={String(kv.value || "")}
                                    onChange={(value) => handleValueChange(kv.id, value)}
                                    inputType={inputType}
                                    options={options}
                                    placeholder={placeholder}
                                />
                                <Button variant="ghost" size="icon" className="size-5 p-1" onClick={() => handleRemoveFilter(kv.id)}>
                                    <XIcon size={14} />
                                </Button>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-row justify-between">
                    <Button variant="ghost" className='bg-foreground/5 rounded-lg' onClick={() => {
                        const firstAvailableColumn = allColumnOptions.find(option =>
                            option && !filterKv.some(filter => filter.id === option.id)
                        );

                        if (firstAvailableColumn) {
                            setFilterKv([...filterKv, {
                                id: firstAvailableColumn.id,
                                value: ""
                            }]);
                        }
                    }}>
                        Add Filter
                    </Button>
                    <Button variant="clear" size="xs" onClick={() => handleApplyFilters(filterKv)}>Apply Filters</Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}