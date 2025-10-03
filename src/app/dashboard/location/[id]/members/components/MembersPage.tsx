'use client'

import { ColumnFiltersState } from '@tanstack/react-table'
import { useMemo, useState, memo, useRef } from 'react'
import {
    Button,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui'
import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
} from '@/components/ui/ToolTip'
import { Plus, X } from 'lucide-react'
import { MemberList } from './MemberList'
import { MembersTabState, useMemberTabData } from './useMemberTabData'

interface MembersPageProps {
    id: string | null
    stripeKey: string | null
}

export default function MembersPage({ id, stripeKey }: MembersPageProps) {
    const currentActiveTabCachedMembersRef = useRef<any[] | null>(null)
    const {
        membersTabs,
        handleNewTab,
        handleRemoveTab,
        handleChangeParam,
        handleFetchForCurrentTab,
        isLoading,
    } = useMemberTabData()
    if (!id) {
        return <div>Loading...</div>
    }

    const renderTabs = useMemo(() => {
        return membersTabs.map((tab) => (
            <MemberTabContent
                key={tab.id}
                tab={tab}
                tabName={tab.name}
                id={id}
                stripeKey={stripeKey}
                isLoading={isLoading}
                handleNewTab={handleNewTab}
                handleRemoveTab={handleRemoveTab}
                handleChangeParam={handleChangeParam}
                handleFetchForCurrentTab={handleFetchForCurrentTab}
            />
        ))
    }, [membersTabs, id, stripeKey])

    return (
        <Tabs
            activationMode="manual"
            defaultValue={membersTabs[0].name}
            className="w-full"
        >
            <TabsList className="w-full p-0 bg-background justify-start border-b rounded-none gap-1">
                {membersTabs.map((tab) => (
                    <TabsTrigger
                        key={tab.name}
                        value={tab.name}
                        className="min-w-38 gap-1 group rounded-none bg-background h-full data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary relative"
                    >
                        <span className="text-[13px]">{tab.name}</span>{' '}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-3 rounded-sm size-[12px] hover:bg-foreground/5 hidden group-hover:block"
                            onClick={() => handleRemoveTab(tab.id)}
                        >
                            <X className="size-[12px]" />
                        </Button>
                    </TabsTrigger>
                ))}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            className="size-11 text-foreground hover:text-foreground hover:bg-foreground/5 rounded-none bg-background h-full data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary"
                            onClick={handleNewTab}
                        >
                            {' '}
                            <Plus />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Open another list</p>
                    </TooltipContent>
                </Tooltip>
            </TabsList>
            {renderTabs}
        </Tabs>
    )
}

const MemberTabContent = memo(function MemberTabContent({
    tab,
    tabName,
    id,
    stripeKey,
    isLoading,
    handleNewTab,
    handleRemoveTab,
    handleChangeParam,
    handleFetchForCurrentTab,
}: {
    tab: MembersTabState
    tabName: string
    id: string
    stripeKey: string | null
    isLoading: boolean
    handleNewTab: () => void
    handleRemoveTab: (id: number) => void
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
    return (
        <TabsContent value={tabName}>
            <MemberList
                memberTab={tab}
                tabId={tab.id}
                params={{ id: id }}
                stripeKey={stripeKey}
                isLoading={isLoading}
                handleNewTab={handleNewTab}
                handleRemoveTab={handleRemoveTab}
                handleChangeParam={handleChangeParam}
                handleFetchForCurrentTab={handleFetchForCurrentTab}
            />
        </TabsContent>
    )
})
