import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { ColumnFiltersState } from '@tanstack/react-table'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { CustomFieldDefinition } from '@/components/custom-fields'

interface TableState {
    page: number
    pageSize: number
    columnFilters: ColumnFiltersState
    searchQuery: string
    selectedTags: string[]
    tagOperator: 'AND' | 'OR'
    sorting: { id: string; direction: 'asc' | 'desc' }[]
    data: {
        error: string | null,
        members: any[] | null
        count: number,
        customFields: CustomFieldDefinition[]
    }
}

export interface MembersTabState {
    id: number
    name: string
    active: boolean
    state: TableState
}

export function useMemberTabData() {
    const supabaseRef = useRef<SupabaseClient | null>(null)

    const [pageState, setPageState] = useState<{
        isActiveTabFetching: boolean
    }>({
        isActiveTabFetching: false,
    })
    const [membersTabs, setMembersTabs] = useState<MembersTabState[]>([
        {
            id: 1,
            name: 'Members',
            active: true,
            state: {
                page: 0,
                pageSize: 25,
                columnFilters: [],
                searchQuery: '',
                selectedTags: [],
                tagOperator: 'AND',
                sorting: [],
                data: {
                    error: null,
                    members: [],
                    count: 0,
                    customFields: []
                },
            },
        },
    ])

    const handleNewTab = async () => {
        setPageState((v) => ({ ...v, isActiveTabFetching: true }))

        try {
            const members =
                (await supabaseRef.current
                    ?.from('members')
                    .select('*')
                    .limit(25)
                    .then(({ data }) => data)) || []
            setMembersTabs((v) => [
                ...v,
                {
                    id: v.length + 1,
                    name: `Members ${v.length + 1}`,
                    active: true,
                    state: {
                        page: 0,
                        pageSize: 25,
                        columnFilters: [],
                        searchQuery: '',
                        selectedTags: [],
                        tagOperator: 'AND',
                        sorting: [],
                        data: {
                            error: null,
                            members: members,
                            count: members.length,
                            customFields: [],
                        },
                    },
                },
            ])
        } catch (error) {
            toast.error('Something went wrong. Please try again.')
        } finally {
            setPageState((v) => ({ ...v, isActiveTabFetching: false }))
        }
    }

    const handleRemoveTab = (id: number) => {
        setMembersTabs((v) => v.filter((tab) => tab.id !== id))
    }

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
    const handleChangeParam = ({
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
    }

    /**
     * Apply column-specific filters based on data type
     */
    const applyColumnFilter = (
        query: any,
        columnId: string,
        value: unknown
    ) => {
        // Text columns - case-insensitive partial match
        const textColumns = [
            'first_name',
            'last_name',
            'email',
            'phone',
            'gender',
            'referral_code',
            'stripe_customer_id',
        ]

        // Boolean columns - exact match
        const booleanColumns = ['first_time']

        // Timestamp columns - date range or exact date
        const timestampColumns = ['created_at', 'updated_at', 'dob']

        // UUID columns - exact match
        const uuidColumns = ['id', 'user_id']

        if (textColumns.includes(columnId)) {
            // Case-insensitive partial match for text
            return query?.ilike(columnId, `%${value}%`)
        } else if (booleanColumns.includes(columnId)) {
            // Boolean exact match
            const boolValue = value === 'true' || value === true
            return query?.eq(columnId, boolValue)
        } else if (timestampColumns.includes(columnId)) {
            // For timestamps, support different formats:
            // 1. Exact date match
            // 2. Date range (if value is an object with from/to)

            if (
                typeof value === 'object' &&
                value !== null &&
                'from' in value &&
                'to' in value
            ) {
                // Date range filter
                const { from, to } = value as { from: string; to: string }
                if (from) query = query?.gte(columnId, from)
                if (to) query = query?.lte(columnId, to)
                return query
            } else if (typeof value === 'string') {
                // For partial date matching, use date comparison
                // This will match dates that start with the given string (e.g., "2024" matches all dates in 2024)
                return query?.gte(columnId, value)
            }
        } else if (uuidColumns.includes(columnId)) {
            // UUID exact match
            return query?.eq(columnId, value)
        } else {
            // Default: exact match for unknown column types
            return query?.eq(columnId, value)
        }

        return query
    }

    const handleFetchForCurrentTab = async (id: number) => {
        setPageState((v) => ({ ...v, isActiveTabFetching: true }))
        try {
            // Guard-rail to check if the tab exists and its active
            const currentTab = membersTabs.find((tab) => tab.id === id && tab.active)
            if (!currentTab) return

            const {
                page,
                pageSize,
                searchQuery,
                selectedTags,
                tagOperator,
                columnFilters,
                sorting,
            } = currentTab.state

            let query = supabaseRef.current
                ?.from('members')
                .select('*', { count: 'exact' })


            // Apply text search
            if (searchQuery) {
                query = query?.ilike('name', `%${searchQuery}%`)
            }

            // Apply tag filters
            if (selectedTags.length > 0) {
                if (tagOperator === 'AND') {
                    query = query?.contains('tags', selectedTags)
                } else {
                    query = query?.overlaps('tags', selectedTags)
                }
            }

            // Apply column filters dynamically based on column type
            if (columnFilters && columnFilters.length > 0) {
                columnFilters.forEach((filter) => {
                    const { id: columnId, value } = filter

                    if (
                        !value ||
                        (typeof value === 'string' && value.trim() === '')
                    ) {
                        return // Skip empty filters
                    }

                    // Apply filter based on column type
                    query = applyColumnFilter(query, columnId, value)
                })
            }

            // Apply sorting
            if (sorting && sorting.length > 0) {
                sorting.forEach(({ id: columnId, direction }) => {
                    query = query?.order(columnId, {
                        ascending: direction === 'asc',
                    })
                })
            } else {
                // Default sorting by created_at descending
                query = query?.order('created_at', { ascending: false })
            }

            // Apply pagination
            const members = await query
                ?.range(page * pageSize, (page + 1) * pageSize - 1)
                ?.limit(pageSize)
                ?.then((res) => {
                    console.log(res);
                })

            const customFields = await supabaseRef.current
                ?.from('member_fields')
                .select(`*, member_custom_fields(value)`)
                .eq('location_id', id)
                .then(({ data }) => data)

            console.log(`[SUPABASE CLIENT FETCH]: Custom Fields: ${JSON.stringify(customFields)}`)
            console.log(`[SUPABASE CLIENT FETCH]: Members: ${JSON.stringify(members)}`)

            setMembersTabs((v) =>
                v.map((tab) =>
                    tab.id === id
                        ? {
                              ...tab,
                              state: { ...tab.state, members: members || [], customFields: customFields || [] },
                          }
                        : tab
                )
            )
        } catch (error) {
            toast.error('Something went wrong. Please try again.')
        } finally {
            setPageState((v) => ({ ...v, isActiveTabFetching: false }))
        }
    }

    useEffect(() => {
        supabaseRef.current = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        return () => {
            supabaseRef.current = null
        }
    }, [])

    return {
        supabaseRef,
        pageState,
        membersTabs,
        isLoading: pageState.isActiveTabFetching,
        handleNewTab,
        handleRemoveTab,
        handleChangeParam,
        handleFetchForCurrentTab,
    }
}
