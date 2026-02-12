'use client'

import { Input } from '@/components/forms'
import { MemberListItem } from '@subtrees/types/member'
import {
    ColumnFiltersState,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import { AddMember } from './CreateMember'
import { MemberColumns } from './MemberColumns'
import { MemberTable } from './MemberTable'

import { Button, ScrollArea, Separator } from '@/components/ui'
import { usePermission } from '@/hooks/usePermissions'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { MembersTabState } from '../../../../../../hooks/userMembers'
import { FilterPopover, SortPopover } from './FilterAndSort'
import TagsFilter from './TagsFilter'

export function MemberList({
    params,
    stripeKey,
    tabId,
    memberTab,
    isLoading,
    handleChangeParam,
}: {
    params: { id: string }
    tabId: string
    stripeKey: string | null
    memberTab: MembersTabState
    isLoading: boolean
    handleChangeParam: (params: {
        id: string
        page: number
        pageSize: number
        searchQuery: string
        selectedTags: string[]
        columnFilters: ColumnFiltersState
        tagOperator: 'AND' | 'OR'
        sorting: { id: string; direction: 'asc' | 'desc' }[]
    }) => void
}) {
    const canAddMember = usePermission("add member", params.id)
    const {
        page,
        pageSize,
        columnFilters,
        searchQuery,
        selectedTags,
        tagOperator,
        sorting,
    } = memberTab.state

    const { filteredData } = memberTab

    const columns = useMemo(
        () => MemberColumns(params.id, filteredData.customFields),
        [params.id, filteredData.customFields]
    )

    const totalPages = useMemo(() => {
        if (filteredData.count && pageSize > 0) {
            return Math.ceil(filteredData.count / pageSize) // size: total items, pageSize: items per page
        }
        return 1 // Default to 1 page if data is unavailable
    }, [filteredData.count, pageSize])

    const handleFiltersChange = (
        updaterOrValue:
            | ColumnFiltersState
            | ((old: ColumnFiltersState) => ColumnFiltersState)
    ) => {
        const filters =
            typeof updaterOrValue === 'function'
                ? updaterOrValue(columnFilters)
                : updaterOrValue
        handleChangeParam({
            id: tabId,
            page: 0,
            pageSize,
            searchQuery,
            selectedTags,
            columnFilters: filters,
            tagOperator,
            sorting,
        })
    }

    const table = useReactTable<MemberListItem>({
        data: filteredData.members || [], // Client-side filtered data
        columns,
        pageCount: totalPages,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onColumnFiltersChange: handleFiltersChange,
        getSortedRowModel: getSortedRowModel(),
        manualPagination: true, // CRITICAL: Prevents infinite loop - we handle pagination in useMemberTabs hook
        state: {
            pagination: {
                pageIndex: page,
                pageSize,
            },
            columnFilters,
        },
        onPaginationChange: (updater) => {
            const newState =
                typeof updater === 'function'
                    ? updater({ pageIndex: page, pageSize })
                    : updater

            handleChangeParam({
                id: tabId,
                page: newState.pageIndex,
                pageSize: newState.pageSize,
                searchQuery,
                selectedTags,
                columnFilters,
                tagOperator,
                sorting,
            })
        },
        // Note: manualPagination and manualFiltering removed - filtering now happens client-side in the hook
    })

    const handleSortChange = (
        sort: { id: string; direction: 'asc' | 'desc' }[]
    ) => {
        handleChangeParam({
            id: tabId,
            page: 0,
            pageSize,
            searchQuery,
            selectedTags,
            columnFilters,
            tagOperator,
            sorting: sort,
        })
    }

    const handleTagsChange = (tagIds: string[]) => {
        handleChangeParam({
            id: tabId,
            page: 0,
            pageSize,
            searchQuery,
            selectedTags: tagIds,
            columnFilters,
            tagOperator,
            sorting,
        })
    }

    const renderAddMember = useMemo(() => {
        if (canAddMember) {
            return <AddMember lid={params.id} stripeKey={stripeKey} />
        }
        return null
    }, [canAddMember, params.id, stripeKey])


    return (
        <div className='space-y-2 bg-muted/50  rounded-lg '>
            <div className="flex flex-row items-center gap-2 px-2 pt-2">
                <FilterPopover
                    columns={columns}
                    filters={columnFilters}
                    onFiltersChange={handleFiltersChange}
                    customFields={filteredData.customFields}
                />
                <SortPopover
                    columns={columns}
                    onSortChange={handleSortChange}
                />

                <Input placeholder="Find a member..."
                    value={searchQuery}
                    onChange={(event) => {
                        handleChangeParam({
                            id: tabId,
                            page: 0,
                            pageSize,
                            searchQuery: event.target.value,
                            selectedTags,
                            columnFilters,
                            tagOperator,
                            sorting,
                        })
                    }}
                    className='h-9'
                    variant="search"
                />
                <TagsFilter
                    locationId={params.id}
                    selectedTags={selectedTags}
                    onTagsChange={handleTagsChange}
                    canCreateTags={true}
                />
                {renderAddMember}
            </div>
            <div>
                <ScrollArea className="h-[calc(100vh-210px)] overflow-hidden">
                    <MemberTable
                        table={table}
                        isLoading={isLoading}
                        columns={columns.length}
                    />
                </ScrollArea>
            </div>
            <div className=' flex flex-row items-center px-4 py-2 gap-2 text-sm'>
                <div className="flex gap-2 items-center ">
                    <Button
                        variant="ghost"
                        className='size-8 bg-background'
                        size="icon"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeftIcon size={14} />
                    </Button>
                    <span>Page</span>
                    <Input
                        type="number"
                        value={page + 1}
                        onChange={(e) =>
                            handleChangeParam({
                                id: tabId,
                                page: Number(e.target.value) - 1,
                                pageSize,
                                searchQuery,
                                selectedTags,
                                columnFilters,
                                tagOperator,
                                sorting,
                            })
                        }
                        className="w-18 h-9"
                    />
                    <span>of {totalPages}</span>
                    <Button
                        variant="ghost"
                        className='size-8 bg-background'
                        size="icon"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronRightIcon size={14} />
                    </Button>
                </div>
                <Separator
                    orientation="vertical"
                    className="bg-foreground/10"
                />
                Total members: {filteredData?.count}
            </div>
        </div>
    )
}
