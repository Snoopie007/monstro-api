'use client'

import { useMembers } from '@/hooks'
import {
    ColumnFiltersState,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { useState, useMemo, useEffect } from 'react'
import { MemberColumns, MemberWithCustomFieldsColumns } from './MemberColumns'
import { Input } from '@/components/forms'
import { MemberTable } from './MemberTable'
import ErrorComponent from '@/components/error'
import { AddMember } from './CreateMember'
import { Member } from '@/types/member'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { ScrollArea, Separator } from '@/components/ui'
import {
    TablePage,
    TablePageContent,
    TablePageFooter,
    TablePageHeader,
    TablePageHeaderSection,
} from '@/components/ui/TablePage'
import { ImportMembers } from '.'
import TagsFilter from './TagsFilter'
import { FilterPopover, SortPopover } from './FilterAndSort'
import { MembersTabState } from './useMemberTabData'
import { debounce } from '@tiptap-pro/extension-table-of-contents'
import { usePermission } from '@/hooks/usePermissions'

export function MemberList({
    params,
    stripeKey,
    tabId,
    memberTab,
    isLoading,
    handleChangeParam,
    handleFetchForCurrentTab,
}: {
    params: { id: string }
    tabId: number
    stripeKey: string | null
    memberTab: MembersTabState
    isLoading: boolean
    handleChangeParam: (params: {
        id: number
        page: number
        pageSize: number
        searchQuery: string
        selectedTags: string[]
        columnFilters: ColumnFiltersState
        tagOperator: 'AND' | 'OR'
        sorting: { id: string; direction: 'asc' | 'desc' }[]
    }) => void
    handleFetchForCurrentTab: (id: number) => void
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
        data,
    } = memberTab.state

    const columns = useMemo(
        () => MemberColumns(params.id, data.customFields),
        [params.id, data.customFields]
    )

    const totalPages = useMemo(() => {
        if (data.count && pageSize > 0) {
            return Math.ceil(data.count / pageSize) // size: total items, pageSize: items per page
        }
        return 1 // Default to 1 page if data is unavailable
    }, [data.count, pageSize])

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

    const table = useReactTable<Member>({
        data: data.members || [], // Only use data when it's available
        columns,
        pageCount: totalPages, // Set total pages from the API
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onColumnFiltersChange: handleFiltersChange,
        getSortedRowModel: getSortedRowModel(),
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
        manualPagination: true, // Enable manual pagination
        manualFiltering: true, // Enable manual filtering
    })

    const handleSearch = useMemo(
        () =>
            debounce((value: string) => {
                handleChangeParam({
                    id: tabId,
                    page: 0,
                    pageSize,
                    searchQuery: value,
                    selectedTags,
                    columnFilters,
                    tagOperator,
                    sorting,
                })
            }, 300), // Wait 300ms after typing stops
        []
    )

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
    }, [canAddMember])

    const renderImportMembers = useMemo(() => {
        if (canAddMember) {
            return <ImportMembers lid={params.id} />
        }
        return null
    }, [canAddMember])

    useEffect(() => {
        if (!isLoading && data.members && data.members.length === 0) {
            handleFetchForCurrentTab(tabId)
        }
    }, [
        tabId,
        pageSize,
        searchQuery,
        selectedTags,
        columnFilters,
        tagOperator,
        sorting,
    ])

    if (data.error) {
        return (
            <ErrorComponent
                error={{ name: 'Member List Error', message: data.error }}
            />
        )
    }

    return (
        <TablePage>
            <TablePageHeader>
                <TablePageHeaderSection>
                    <div className="flex flex-row items-center gap-2">
                        <FilterPopover
                            columns={columns}
                            filters={columnFilters}
                            onFiltersChange={handleFiltersChange}
                            customFields={data.customFields}
                        />
                        <SortPopover
                            columns={columns}
                            onSortChange={handleSortChange}
                        />

                        <Input placeholder="Find a member..."
                            onChange={(event) => {
                                handleSearch(event.target.value)
                            }}
                            variant="search"
                        />
                        <TagsFilter
                            locationId={params.id}
                            selectedTags={selectedTags}
                            onTagsChange={handleTagsChange}
                            canCreateTags={true}
                        />
                        {renderAddMember}
                        {renderImportMembers}
                    </div>
                </TablePageHeaderSection>
            </TablePageHeader>
            <TablePageContent>
                <ScrollArea className="h-[calc(100vh-190px)] overflow-hidden">
                    <MemberTable
                        table={table}
                        isLoading={isLoading}
                        columns={columns.length}
                    />
                </ScrollArea>
            </TablePageContent>
            <TablePageFooter>
                <div className="flex gap-2 items-center p-2">
                    <button
                        className="text-foreground/50 border-foreground/50 p-1 border rounded-xs hover:text-indigo-600 hover:border-indigo-600 cursor-pointer"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeftIcon size={14} />
                    </button>
                    <span>Page</span>
                    <span>
                        <input
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
                            className="w-10 py-0.5 text-center border border-foreground/50 text-xs rounded-xs"
                        />
                    </span>
                    <span>of {totalPages}</span>
                    <button
                        className="text-foreground/50 border-foreground/50 p-1 border rounded-xs hover:text-indigo-600 hover:border-indigo-600 cursor-pointer"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronRightIcon size={14} />
                    </button>
                </div>
                <Separator
                    orientation="vertical"
                    className="bg-foreground/10"
                />
                <div className=" px-2">Total members: {data?.count}</div>
            </TablePageFooter>
        </TablePage>
    )
}
