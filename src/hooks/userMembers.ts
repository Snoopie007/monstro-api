import { CustomFieldDefinition, MemberListItem } from '@/types'
import { ColumnFiltersState } from '@tanstack/react-table'
import { useCallback, useState } from 'react'
import { useLocationMembers } from './useLocationMembers'

interface TableState {
    page: number
    pageSize: number
    columnFilters: ColumnFiltersState
    searchQuery: string
    selectedTags: string[]
    tagOperator: 'AND' | 'OR'
    sorting: { id: string; direction: 'asc' | 'desc' }[]
}

interface TabConfig {
    id: number
    name: string
    active: boolean
    locationId: string
    state: TableState
}

export interface MembersTabState {
    id: number
    name: string
    active: boolean
    locationId: string
    state: TableState & {
        isLoading: boolean
        data: {
            error: string | null
            members: MemberListItem[]
            count: number
            customFields: CustomFieldDefinition[]
        }
    }
}

const createDefaultTabConfig = (locationId: string, tabId: number = 0): TabConfig => ({
    id: tabId,
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
    },
})

export function useUserTabState(locationId: string) {
    const [tabConfigs, setTabConfigs] = useState<TabConfig[]>([
        createDefaultTabConfig(locationId)
    ])

    const activeTabConfig = tabConfigs.find((tab) => tab.active)
    const activeTabState = activeTabConfig?.state

    const {
        members,
        count,
        customFields,
        isLoading,
        isFetching,
        error,
    } = useLocationMembers({
        locationId,
        page: activeTabState?.page ?? 0,
        size: activeTabState?.pageSize ?? 25,
        query: activeTabState?.searchQuery ?? '',
        tags: activeTabState?.selectedTags ?? [],
        tagOperator: activeTabState?.tagOperator ?? 'AND',
        sortBy: activeTabState?.sorting?.[0]?.id ?? 'created',
        sortOrder: activeTabState?.sorting?.[0]?.direction ?? 'desc',
        columnFilters: activeTabState?.columnFilters ?? [],
        enabled: !!activeTabConfig,
    })

    const membersTabs: MembersTabState[] = tabConfigs.map((tab) => ({
        ...tab,
        state: {
            ...tab.state,
            isLoading: tab.active ? (isLoading || isFetching) : false,
            data: tab.active
                ? {
                    error: error ? String(error) : null,
                    members,
                    count,
                    customFields,
                }
                : {
                    error: null,
                    members: [],
                    count: 0,
                    customFields: [],
                },
        },
    }))

    const handleNewTab = useCallback(() => {
        const newTabId = Math.floor(1000 + Math.random() * 9000)

        setTabConfigs((tabs) => [
            ...tabs.map((tab) => ({ ...tab, active: false })),
            createDefaultTabConfig(locationId, newTabId),
        ])
    }, [locationId])

    const handleRemoveTab = useCallback((id: number) => {
        setTabConfigs((tabs) => {
            const remaining = tabs.filter((tab) => tab.id !== id)
            if (remaining.length === 0) {
                return [createDefaultTabConfig(locationId)]
            }
            const wasActive = tabs.find((tab) => tab.id === id)?.active
            if (wasActive && remaining.length > 0) {
                remaining[0].active = true
            }
            return remaining
        })
    }, [locationId])

    const handleChangeParam = useCallback(({
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
        setTabConfigs((tabs) =>
            tabs.map((tab) =>
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
    }, [])

    const handleFetchForCurrentTab = useCallback(() => {
    }, [])

    return {
        membersTabs,
        isLoading: isLoading || isFetching,
        handleNewTab,
        handleRemoveTab,
        handleChangeParam,
        handleFetchForCurrentTab,
    }
}
