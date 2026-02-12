import { TabConfig, SavedTabConfig } from '@subtrees/types/member'

const MAX_CUSTOM_TABS = 20

function createStorageKey(locationId: string): string {
    return `memberTabs_${locationId}`
}

export function saveCustomTabs(locationId: string, tabs: TabConfig[]): void {
    try {
        const customTabs = tabs
            .filter(t => t.removable)
            .slice(0, MAX_CUSTOM_TABS)
            .map(t => ({
                id: t.id,
                name: t.name,
                statusFilter: t.statusFilter,
                columnFilters: t.state.columnFilters,
                searchQuery: t.state.searchQuery,
                selectedTags: t.state.selectedTags,
                tagOperator: t.state.tagOperator,
                sorting: t.state.sorting,
            }))
        localStorage.setItem(createStorageKey(locationId), JSON.stringify(customTabs))
    } catch (error) {
        console.error('Failed to save custom tabs:', error)
    }
}

export function loadCustomTabs(locationId: string): SavedTabConfig[] {
    try {
        const saved = localStorage.getItem(createStorageKey(locationId))
        return saved ? JSON.parse(saved) : []
    } catch {
        return []
    }
}

export function getCustomTabCount(locationId: string): number {
    try {
        const saved = localStorage.getItem(createStorageKey(locationId))
        return saved ? JSON.parse(saved).length : 0
    } catch {
        return 0
    }
}
