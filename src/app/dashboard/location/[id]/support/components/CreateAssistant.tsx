'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { tryCatch } from '@/libs/utils'

export default function CreateAssistant() {
    const params = useParams<{ id: string }>()
    const router = useRouter()
    const [isCreating, setIsCreating] = useState(false)

    async function handleCreate() {
        if (!params?.id || isCreating) return
        setIsCreating(true)
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${params.id}/support`, { method: 'POST' })
        )

        if (!result || !result.ok || error) {
            setIsCreating(false)
            return
        }

        // Redirect to settings after assistant creation
        router.push(`/dashboard/location/${params.id}/support/settings`)
    }

    return (
        <div className="h-full p-4">
            <div className="h-full flex flex-col items-center justify-center bg-foreground/5 rounded-lg">
                <div className="max-w-md mx-auto text-center space-y-4">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold">Get Started</h1>
                        <p className="text-sm text-muted-foreground">
                            Welcome to Monstro Support! Let's get started with
                            creating and configuring your support assistant.
                        </p>
                    </div>
                    <div>
                        <Button
                            onClick={handleCreate}
                            disabled={isCreating}
                            className="rounded-md"
                        >
                            {isCreating ? 'Creating...' : 'Create Assistant'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
