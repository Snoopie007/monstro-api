'use client'

import { useState } from 'react'
import { Tabs, TabsContent } from '@/components/ui'
import { MemberList } from './MemberList'
import { MembersTabList } from './MembersTabList'
import { SaveTabDialog } from './SaveTabDialog'
import { useMemberTabs } from '@/hooks/userMembers'

interface MembersPageProps {
    id: string | null
    stripeKey: string | null
}

export default function MembersPage({ id, stripeKey }: MembersPageProps) {
    const {
        membersTabs,
        activeTabId,
        isLoading,
        handleSetActiveTab,
        handleRemoveTab,
        handleAddCustomTab,
        handleChangeParam,
        canAddMoreTabs,
        suggestedTabName,
    } = useMemberTabs(id ?? '')

    const [saveDialogOpen, setSaveDialogOpen] = useState(false)

    if (!id) {
        return <div>Loading...</div>
    }

    return (
        <>
            <Tabs
                value={activeTabId}
                onValueChange={handleSetActiveTab}
                className="w-full"
            >
                <MembersTabList
                    tabs={membersTabs}
                    activeTabId={activeTabId}
                    isLoading={isLoading}
                    onTabChange={handleSetActiveTab}
                    onRemoveTab={handleRemoveTab}
                    onAddTab={() => setSaveDialogOpen(true)}
                    canAddMore={canAddMoreTabs}
                />

                {membersTabs.map(tab => (
                    <TabsContent key={tab.id} value={tab.id}>
                        <MemberList
                            memberTab={tab}
                            tabId={tab.id}
                            params={{ id }}
                            stripeKey={stripeKey}
                            isLoading={isLoading}
                            handleChangeParam={handleChangeParam}
                        />
                    </TabsContent>
                ))}
            </Tabs>

            <SaveTabDialog
                open={saveDialogOpen}
                onOpenChange={setSaveDialogOpen}
                onSave={handleAddCustomTab}
                suggestedName={suggestedTabName}
                disabled={!canAddMoreTabs}
            />
        </>
    )
}
