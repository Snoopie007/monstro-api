import { Popover, PopoverTrigger, Button, PopoverContent, Separator } from "@/components/ui"
import { ListOrderedIcon, TextAlignJustify, XIcon } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from "@/components/forms";
import { useEffect, useState } from "react";
import { MemberWithCustomFieldsColumns } from "../MemberColumns";
import { ColumnDef } from "@/libs/table-utils";

interface SortPopoverProps {
    columns: ColumnDef<MemberWithCustomFieldsColumns, any>[];
    onSortChange: (sort: { id: string, direction: 'asc' | 'desc' }[]) => void;
}

export function SortPopover({ columns, onSortChange }: SortPopoverProps) {
    const [sort, setSort] = useState<{ id: string, direction: 'asc' | 'desc' }[]>([]);

    const columnOptions = columns
        .filter((column: ColumnDef<MemberWithCustomFieldsColumns, any> & { accessorKey?: string }) => column.id !== 'select' && column.accessorKey !== 'tags')
        .map((column: ColumnDef<MemberWithCustomFieldsColumns, any> & { accessorKey?: string }) => {
            const { accessorKey, id, header } = column;
            return {
                id: accessorKey ?? id ?? 'name',
                label: header
            }
        })

    const handleColumnSelect = (id: string) => {
        console.log("id", id)
        // add to sort array with direction asc
        setSort(v => [...v, { id, direction: 'asc' }])
    }

    const handleDirectionChange = (id: string) => {
        setSort(v => v.map(s => s.id === id ? { ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' } : s))
    }

    const handleRemoveSort = (id: string) => {
        setSort(v => v.filter(s => s.id !== id))
    }

    const handleApplySort = (sort: { id: string, direction: 'asc' | 'desc' }[]) => {
        console.log("sort", sort)
        onSortChange(sort)
    }

    const renderNoSorts = () => {
        return (
            <>
                <h5 className="text-sm font-medium">No sort applied</h5>
                <p className="text-muted-foreground text-sm">Select a column to sort by</p>
            </>
        )
    }

    const renderSortItems = () => {
        return (
            <div className="flex flex-col space-y-2">
                {sort.map((s, index) => (
                    <div key={index} className="flex flex-row justify-between items-center">
                        <span className="text-xs text-muted-foreground truncate flex flex-row items-center gap-2 max-w-[150px]">
                            <TextAlignJustify size={12} />
                            {columnOptions.find(c => c.id === s.id)?.label as string}
                        </span>
                        {/* Switch for toggling direction */}
                        <div className="flex flex-row items-center gap-2">
                            <span className="text-sm">ascending: <Switch id={`sort-${s.id}`} checked={s.direction === 'asc'} onCheckedChange={() => handleDirectionChange(s.id)} /></span>
                            <Button variant="ghost" size="icon" className="hover:bg-foreground/10 size-5 p-1" onClick={() => handleRemoveSort(s.id)}><XIcon size={12} /></Button>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="hover:bg-foreground/10">
                    <ListOrderedIcon size={14} className="mr-2" />
                    Sort
                    {sort.length > 0 && <span className="text-sm text-foreground/80 ml-2 px-2 py-0.5 bg-foreground/10 rounded-full">{sort.length}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="min-w-96 max-w-96 p-2 border-foreground/10 overflow-hidden space-y-2" align="start">
                {sort.length === 0 && renderNoSorts()}
                {sort.length > 0 && renderSortItems()}
                <Separator className="my-2" />
                <div className="flex flex-row justify-between gap-2">
                    <Select onValueChange={handleColumnSelect}>
                        <SelectTrigger className="w-fit h-8 text-xs">
                            <SelectValue placeholder="Pick a column to sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            {columnOptions.map((option, index) => (
                                <SelectItem value={option.id} key={index}>{option.label as string}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="clear" size="sm" onClick={() => handleApplySort(sort)}>
                        Apply Sorting
                    </Button>
                </div>

            </PopoverContent>
        </Popover>
    )
}