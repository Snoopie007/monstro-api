'use client'

import { ColumnFiltersState } from '@tanstack/react-table'
import { useMemo, memo, useEffect } from 'react'
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
    if (!id) {
        return <div>Loading...</div>
    }

    const {
        membersTabs,
        handleNewTab,
        handleRemoveTab,
        handleChangeParam,
        handleFetchForCurrentTab,
    } = useMemberTabData(id)

    useEffect(() => {
        // Only fetch on initial mount when we have exactly one tab with no data
        if (
            membersTabs.length === 1 &&
            membersTabs[0].active &&
            membersTabs[0].state.data.members &&
            membersTabs[0].state.data.members.length === 0
        ) {
            handleFetchForCurrentTab(membersTabs[0].id)
        }
    }, []) // Run only once on mount

    const renderTabs = useMemo(() => {
        return membersTabs.map((tab) => (
            <MemberTabContent
                key={tab.id}
                tab={tab}
                tabName={tab.name}
                id={id}
                stripeKey={stripeKey}
                isLoading={tab.state.isLoading}
                handleChangeParam={handleChangeParam}
                handleFetchForCurrentTab={handleFetchForCurrentTab}
            />
        ))
    }, [membersTabs, id, stripeKey])

    return (
        <Tabs
            activationMode="manual"
            defaultValue={String(membersTabs[0].id)}
            className="w-full"
        >
            <TabsList className="w-full bg-transparent  justify-start border-none  rounded-none gap-1">
                {membersTabs.map((tab) => (
                    <TabsTrigger
                        key={tab.id}
                        value={String(tab.id)}
                        className=" gap-1 group  rounded bg-background h-full data-[state=active]:shadow-none  relative"
                        asChild
                    >
                        <div className="flex flex-row items-center gap-1">
                            <span >
                                {tab.name.length > 11 ? `${tab.name.slice(0, 11)}...`
                                    : tab.name}
                            </span>{' '}
                            <Button
                                variant="ghost"
                                size="icon"
                                className=" rounded-sm size-[12px] hover:bg-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                onClick={() => handleRemoveTab(tab.id)}
                            >
                                <X className="size-[12px]" />
                            </Button>
                        </div>
                    </TabsTrigger>
                ))}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            className="size-8 "
                            onClick={handleNewTab}
                        >

                            +
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
    handleChangeParam,
    handleFetchForCurrentTab,
}: {
    tab: MembersTabState
    tabName: string
    id: string
    stripeKey: string | null
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
    return (
        <TabsContent value={String(tab.id)}>
            <MemberList
                memberTab={tab}
                tabId={tab.id}
                params={{ id: id }}
                stripeKey={stripeKey}
                isLoading={isLoading}
                handleChangeParam={handleChangeParam}
                handleFetchForCurrentTab={handleFetchForCurrentTab}
            />
        </TabsContent>
    )
})
