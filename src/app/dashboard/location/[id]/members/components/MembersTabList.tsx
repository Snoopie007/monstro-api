'use client'

import { TabsList, TabsTrigger } from '@/components/ui'
import { Button } from '@/components/ui'
import { Plus, X } from 'lucide-react'
import { MembersTabState } from '@/hooks/userMembers'
import { memo } from 'react'

interface MembersTabListProps {
    tabs: MembersTabState[]
    activeTabId: string
    isLoading: boolean
    onTabChange: (tabId: string) => void
    onRemoveTab: (tabId: string) => void
    onAddTab: () => void
    canAddMore: boolean
}

export const MembersTabList = memo(function MembersTabList({
    tabs,
    activeTabId,
    isLoading,
    onTabChange,
    onRemoveTab,
    onAddTab,
    canAddMore,
}: MembersTabListProps) {
    return (
        <TabsList className="w-full bg-transparent justify-start border-none px-0 h-11" aria-disabled={isLoading}>
            {tabs.map(tab => (
                <TabItem
                    key={tab.id}
                    tab={tab}
                    isActive={tab.id === activeTabId}
                    isLoading={isLoading}
                    onActivate={() => onTabChange(tab.id)}
                    onRemove={() => onRemoveTab(tab.id)}
                />
            ))}

            <AddTabButton onClick={onAddTab} disabled={!canAddMore || isLoading} isLoading={isLoading} />
        </TabsList>
    )
})

interface TabItemProps {
    tab: MembersTabState
    isActive: boolean
    isLoading: boolean
    onActivate: () => void
    onRemove: () => void
}

const TabItem = memo(function TabItem({ tab, isActive, isLoading, onActivate, onRemove }: TabItemProps) {
    return (
        <TabsTrigger
            value={tab.id}
            onClick={onActivate}
            disabled={isLoading}
            className="gap-1 data-[state=active]:bg-muted/50 rounded-lg bg-transparent h-full data-[state=active]:shadow-none relative group disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <span className="text-sm">
                {tab.name}
                <span className="ml-1.5 text-xs text-muted-foreground">
                    ({tab.filteredData.count})
                </span>
            </span>

            {tab.removable && !isLoading && (
                <RemoveButton onClick={onRemove} />
            )}
        </TabsTrigger>
    )
})

const RemoveButton = memo(function RemoveButton({ onClick }: { onClick: () => void }) {
    return (
        <X
            className="size-3.5 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
            onClick={e => {
                e.stopPropagation()
                onClick()
            }}
        />
    )
})

interface AddTabButtonProps {
    onClick: () => void
    disabled: boolean
    isLoading: boolean
}

const AddTabButton = memo(function AddTabButton({ onClick, disabled, isLoading }: AddTabButtonProps) {
    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className="ml-1 disabled:opacity-50 disabled:cursor-not-allowed"
            title={disabled && !isLoading ? 'Maximum tabs reached' : 'Save current filters as new tab'}
        >
            <Plus className="size-4" />
        </Button>
    )
})
