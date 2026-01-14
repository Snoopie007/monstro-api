'use client'

import { useRef } from 'react'
import { MigrationList, ImportMigration } from '.'

export function MigrationSection({ lid }: { lid: string }) {
    const refetchRef = useRef<(() => void) | null>(null)

    return (
        <>
            <div className="flex flex-row items-center justify-between">
                <h2 className="text-xl font-semibold">Migrations</h2>
                <ImportMigration
                    lid={lid}
                    onSuccess={() => refetchRef.current?.()}
                />
            </div>
            <div className="border border-foreground/10 rounded-lg">
                <MigrationList
                    lid={lid}
                    onRefetchReady={(fn) => {
                        refetchRef.current = fn
                    }}
                />
            </div>
        </>
    )
}
