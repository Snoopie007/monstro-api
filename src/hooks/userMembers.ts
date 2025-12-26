import { generateTabName } from '@/libs/tabNameGenerator'
import { loadCustomTabs, saveCustomTabs } from '@/libs/tabStorage'
import {
    MembersTabState,
    MemberStatus,
    SavedTabConfig,
    TabConfig,
    TabParams
} from '@/types/member'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { filterByColumnFilters, filterBySearch, filterByStatus, filterByTags, sortMembers } from './filters'
import { useAllLocationMembers } from './useAllLocationMembers'

const INACTIVE_STATUSES: MemberStatus[] = [
    'incomplete',
    'past_due',
    'canceled',
    'paused',
    'trialing',
    'unpaid',
    'incomplete_expired',
]

interface UseMemberTabsResult {
    membersTabs: MembersTabState[]
    activeTabId: string
    isLoading: boolean
    error: Error | null
    handleSetActiveTab: (tabId: string) => void
    handleRemoveTab: (tabId: string) => void
    handleAddCustomTab: (name: string) => void
    handleChangeParam: (params: TabParams) => void
    refetch: () => void
    canAddMoreTabs: boolean
    suggestedTabName: string
}

export function useMemberTabs(locationId: string): UseMemberTabsResult {
    const [activeTabId, setActiveTabId] = useState<string>('active')
    const [tabConfigs, setTabConfigs] = useState<TabConfig[]>(createPresetTabs)
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const { data, isLoading, isFetching, error, refetch } = useAllLocationMembers(locationId)
    const allMembers = data?.members ?? []
    const customFields = data?.customFields ?? []

    useEffect(() => {
        const saved = loadCustomTabs(locationId)
        if (saved.length > 0) {
            const customTabs = saved.map(createTabConfigFromSaved)
            setTabConfigs(tabs => [...tabs, ...customTabs])
        }
    }, [locationId])

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
        }
    }, [])

    const membersTabs: MembersTabState[] = useMemo(() => {
        return tabConfigs.map(tab => {
            const { statusFilter, state } = tab
            const { searchQuery, selectedTags, tagOperator, columnFilters, sorting, page, pageSize } = state

            let filtered = filterByStatus(allMembers, statusFilter)
            filtered = filterBySearch(filtered, searchQuery)
            filtered = filterByTags(filtered, selectedTags, tagOperator)
            filtered = filterByColumnFilters(filtered, columnFilters)
            filtered = sortMembers(filtered, sorting)

            const totalCount = filtered.length
            const startIndex = page * pageSize
            const paginatedMembers = filtered.slice(startIndex, startIndex + pageSize)

            return {
                ...tab,
                filteredData: {
                    members: paginatedMembers,
                    count: totalCount,
                    customFields,
                },
            }
        })
    }, [tabConfigs, allMembers, customFields])

    const handleSetActiveTab = useCallback((tabId: string) => {
        setActiveTabId(tabId)
    }, [])

    const handleRemoveTab = useCallback((tabId: string) => {
        setTabConfigs(tabs => {
            const tab = tabs.find(t => t.id === tabId)
            if (!tab?.removable) return tabs

            const remaining = tabs.filter(t => t.id !== tabId)
            if (activeTabId === tabId && remaining.length > 0) {
                setActiveTabId(remaining[0].id)
            }
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
            saveTimeoutRef.current = setTimeout(() => {
                saveCustomTabs(locationId, remaining)
            }, 100)
            return remaining
        })
    }, [activeTabId, locationId])

    const handleAddCustomTab = useCallback((name: string) => {
        const activeTab = tabConfigs.find(t => t.id === activeTabId)
        if (!activeTab) return

        const newTab: TabConfig = {
            id: `custom_${Date.now()}`,
            name: name.trim(),
            statusFilter: [...activeTab.statusFilter],
            removable: true,
            state: { ...activeTab.state, page: 0 },
        }

        setTabConfigs(tabs => {
            const updated = [...tabs, newTab]
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
            saveTimeoutRef.current = setTimeout(() => {
                saveCustomTabs(locationId, updated)
            }, 100)
            return updated
        })
        setActiveTabId(newTab.id)
    }, [activeTabId, tabConfigs, locationId])

    const handleChangeParam = useCallback((params: TabParams) => {
        setTabConfigs(tabs => {
            const updated = tabs.map(tab =>
                tab.id === params.id
                    ? { ...tab, state: { ...tab.state, ...params } }
                    : tab
            )
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
            saveTimeoutRef.current = setTimeout(() => {
                saveCustomTabs(locationId, updated)
            }, 100)
            return updated
        })
    }, [locationId])

    const canAddMoreTabs = useMemo(() => {
        return tabConfigs.filter(t => t.removable).length < 20
    }, [tabConfigs])

    const suggestedTabName = useMemo(() => {
        const activeTab = tabConfigs.find(t => t.id === activeTabId)
        if (!activeTab) return ''
        return generateTabName({
            statusFilter: activeTab.statusFilter,
            selectedTags: activeTab.state.selectedTags,
            searchQuery: activeTab.state.searchQuery,
            columnFilters: activeTab.state.columnFilters,
        })
    }, [activeTabId, tabConfigs])

    return {
        membersTabs,
        activeTabId,
        isLoading: isLoading || isFetching,
        error,
        handleSetActiveTab,
        handleRemoveTab,
        handleAddCustomTab,
        handleChangeParam,
        refetch,
        canAddMoreTabs,
        suggestedTabName,
    }
}

function createPresetTabs(): TabConfig[] {
    return [
        {
            id: 'active',
            name: 'Active',
            statusFilter: ['active'],
            removable: false,
            state: {
                page: 0,
                pageSize: 25,
                columnFilters: [{ id: 'status', value: 'active' }],
                searchQuery: '',
                selectedTags: [],
                tagOperator: 'AND',
                sorting: [],
            },
        },
        {
            id: 'inactive',
            name: 'Inactive',
            statusFilter: INACTIVE_STATUSES,
            removable: false,
            state: {
                page: 0,
                pageSize: 25,
                columnFilters: [],
                searchQuery: '',
                selectedTags: [],
                tagOperator: 'AND',
                sorting: [],
            },
        },
        {
            id: 'all',
            name: 'All',
            statusFilter: [],
            removable: false,
            state: {
                page: 0,
                pageSize: 25,
                columnFilters: [],
                searchQuery: '',
                selectedTags: [],
                tagOperator: 'AND',
                sorting: [],
            },
        },
    ]
}

function createTabConfigFromSaved(saved: SavedTabConfig): TabConfig {
    return {
        id: saved.id,
        name: saved.name,
        statusFilter: saved.statusFilter,
        removable: true,
        state: {
            page: 0,
            pageSize: 25,
            columnFilters: saved.columnFilters,
            searchQuery: saved.searchQuery,
            selectedTags: saved.selectedTags,
            tagOperator: saved.tagOperator,
            sorting: saved.sorting,
        },
    }
}

export type { MembersTabState }
