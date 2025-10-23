import { ColumnFiltersState } from '@tanstack/react-table'
import { useEffect, useRef, useState, useCallback } from 'react'
import { toast } from 'react-toastify'
import { CustomFieldDefinition } from '@/app/dashboard/location/[id]/members/[mid]/components/CustomFields'
import { ApiClient, createMonstroApiClient } from '@/libs/api'

interface TableState {
    page: number
    pageSize: number
    columnFilters: ColumnFiltersState
    searchQuery: string
    selectedTags: string[]
    tagOperator: 'AND' | 'OR'
    sorting: { id: string; direction: 'asc' | 'desc' }[]
    isLoading: boolean
    data: {
        error: string | null
        members: any[] | null
        count: number
        customFields: CustomFieldDefinition[]
    }
}

export interface MembersTabState {
    id: number
    name: string
    active: boolean
    locationId: string
    state: TableState
}

export function useMemberTabData(locationId: string, memberId?: string) {
    const apiRef = useRef<ApiClient | null>(null)

    const [pageState, setPageState] = useState<{ isActiveTabFetching: boolean }>({
        isActiveTabFetching: true,
    })

    const [membersTabs, setMembersTabs] = useState<MembersTabState[]>([{
        id: 0,
        name: 'All Members',
        active: true,
        locationId,
        state: {
            page: 0,
            pageSize: 25,
            columnFilters: [],
            searchQuery: '',
            selectedTags: [],
            tagOperator: 'AND',
            sorting: [],
            isLoading: true,
            data: {
                error: null,
                members: [],
                count: 0,
                customFields: [],
            },
        },
    }])

    const handleNewTab = useCallback(async () => {
        const newTabId = Math.floor(1000 + Math.random() * 9000)

        setMembersTabs((v) => [...v, {
            id: newTabId,
            name: `All Members`,
            active: true,
            locationId,
            state: {
                page: 0,
                pageSize: 25,
                columnFilters: [],
                searchQuery: '',
                selectedTags: [],
                tagOperator: 'AND',
                sorting: [],
                isLoading: true,
                data: {
                    error: null,
                    members: [],
                    count: 0,
                    customFields: [],
                },
            },
        },
        ])

        // Fetch data asynchronously
        try {
            // Fetch all members for this location
            const response = await apiRef.current?.get(`/protected/loc/${locationId}/members`, {
                size: 25,
                page: 1,
            })
            const members = response?.members || []
            const count = response?.count || 0

            // Update tab with fetched data
            setMembersTabs((v) =>
                v.map((tab) =>
                    tab.id === newTabId
                        ? {
                            ...tab,
                            state: {
                                ...tab.state,
                                isLoading: false,
                                data: {
                                    error: null,
                                    members: members,
                                    count: count,
                                    customFields:
                                        response?.customFields || [],
                                },
                            },
                        }
                        : tab
                )
            )
        } catch (error) {
            console.error('Error fetching members:', error)
            toast.error('Something went wrong. Please try again.')

            // Update tab with error state
            setMembersTabs((v) =>
                v.map((tab) =>
                    tab.id === newTabId
                        ? {
                            ...tab,
                            state: {
                                ...tab.state,
                                isLoading: false,
                                data: {
                                    ...tab.state.data,
                                    error: 'Failed to fetch members',
                                },
                            },
                        }
                        : tab
                )
            )
        }
    }, [locationId, memberId])

    const handleRemoveTab = useCallback((id: number) => {
        // find the tab with the given id and remove it and make the first tab active
        setMembersTabs((v) => {
            const tabsWithNewActiveTab = v.map((tab) =>
                tab.id === id
                    ? { ...tab, active: true }
                    : { ...tab, active: false }
            )
            return tabsWithNewActiveTab.filter((tab) => tab.id !== id)
        })
    }, [])

    /**
     * Handles pagination, filter, search, and sorting for a specific tab
     * @param id - The id of the tab to handle pagination, filter, search, and sorting for
     * @param page - The page to set the members to
     * @param pageSize - The page size to set the members to
     * @param searchQuery - The search query to filter the members by
     * @param selectedTags - The selected tags to filter the members by
     * @param columnFilters - The column filters to filter the members by
     * @param tagOperator - The tag operator to filter the members by
     * @param sorting - The sorting configuration to sort the members by
     */
    const handleChangeParam = useCallback(
        ({
            id,
            page,
            pageSize,
            searchQuery,
            selectedTags,
            columnFilters,
            tagOperator,
            sorting = [],
        }: {
            id: number
            page: number
            pageSize: number
            searchQuery: string
            selectedTags: string[]
            columnFilters: ColumnFiltersState
            tagOperator: 'AND' | 'OR'
            sorting: { id: string; direction: 'asc' | 'desc' }[]
        }) => {
            setMembersTabs((v) =>
                v.map((tab) =>
                    tab.id === id
                        ? {
                            ...tab,
                            state: {
                                ...tab.state,
                                page,
                                pageSize,
                                searchQuery,
                                selectedTags,
                                columnFilters,
                                tagOperator,
                                sorting,
                            },
                        }
                        : tab
                )
            )
        },
        []
    )

    const handleFetchForCurrentTab = useCallback(
        async (id: number) => {
            // Set loading state for the specific tab
            setMembersTabs((v) =>
                v.map((tab) =>
                    tab.id === id
                        ? {
                            ...tab,
                            state: {
                                ...tab.state,
                                isLoading: true,
                            },
                        }
                        : tab
                )
            )

            try {
                // Guard-rail to check if the tab exists and its active
                const currentTab = membersTabs.find(
                    (tab) => tab.id === id && tab.active
                )
                if (!currentTab) return

                const {
                    page,
                    pageSize,
                    searchQuery,
                    selectedTags,
                    tagOperator,
                    sorting,
                    columnFilters,
                } = currentTab.state
                const finalTags = selectedTags.join(',');
                // Prepare API parameters
                const params: Record<string, any> = {
                    size: pageSize,
                    page: page + 1, // API uses 1-based indexing
                    query: searchQuery || undefined,
                    tags: selectedTags.length > 0 ? finalTags : undefined,
                    tagOperator:
                        selectedTags.length > 0 ? tagOperator : undefined,
                }

                // Add sorting parameters
                if (sorting && sorting.length > 0) {
                    const { id: sortColumn, direction } = sorting[0]
                    params.sortBy = sortColumn
                    params.sortOrder = direction
                }

                // Add column filters parameters
                if (columnFilters && columnFilters.length > 0) {
                    params.columnFilters = JSON.stringify(columnFilters)
                }

                // Fetch members and custom fields from API
                const response = await apiRef.current?.get(
                    `/protected/loc/${currentTab.locationId}/members`,
                    params
                )

                setMembersTabs((v) =>
                    v.map((tab) =>
                        tab.id === id
                            ? {
                                ...tab,
                                state: {
                                    ...tab.state,
                                    isLoading: false,
                                    data: {
                                        members: response?.members || [],
                                        customFields:
                                            response?.customFields || [],
                                        count: response?.count || 0,
                                        error: response?.error || null,
                                    },
                                },
                            }
                            : tab
                    )
                )
            } catch (error) {
                toast.error('Something went wrong. Please try again.')

                // Set error state for the specific tab
                setMembersTabs((v) =>
                    v.map((tab) =>
                        tab.id === id
                            ? {
                                ...tab,
                                state: {
                                    ...tab.state,
                                    isLoading: false,
                                    data: {
                                        ...tab.state.data,
                                        error: 'Failed to fetch members',
                                    },
                                },
                            }
                            : tab
                    )
                )
            }
        },
        [membersTabs]
    )

    useEffect(() => {
        apiRef.current = createMonstroApiClient()

        return () => {
            apiRef.current = null
        }
    }, [])

    useEffect(() => {
        // when any params change, fetch the data for the current tab
        const currentTab = membersTabs.find((tab) => tab.active)
        if (currentTab) {
            handleFetchForCurrentTab(currentTab.id)
        }
    }, [membersTabs.find((tab) => tab.active)?.state.page,
    membersTabs.find((tab) => tab.active)?.state.pageSize,
    membersTabs.find((tab) => tab.active)?.state.searchQuery,
    membersTabs.find((tab) => tab.active)?.state.selectedTags,
    membersTabs.find((tab) => tab.active)?.state.columnFilters,
    membersTabs.find((tab) => tab.active)?.state.tagOperator,
    membersTabs.find((tab) => tab.active)?.state.sorting,
    ])

    return {
        apiRef,
        pageState,
        membersTabs,
        isLoading: pageState.isActiveTabFetching,
        handleNewTab,
        handleRemoveTab,
        handleChangeParam,
        handleFetchForCurrentTab,
    }
}
