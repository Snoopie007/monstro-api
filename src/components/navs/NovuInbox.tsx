import { Inbox } from '@novu/nextjs'
import { useSession } from 'next-auth/react'

export function NovuInbox() {
    const { data: session } = useSession()
    const user = session?.user
    const appId = process.env.NEXT_PUBLIC_NOVU_APP_IDENTIFIER

    if (!process.env.NEXT_PUBLIC_NOVU_APP_IDENTIFIER)
        throw new Error('NEXT_PUBLIC_NOVU_APP_IDENTIFIER is not set')

    if (!appId || !user?.id) return null

    return (
        <Inbox
            applicationIdentifier={appId}
            subscriberId={user?.id}
            appearance={{
                variables: {
                    colorPrimary: '222.2 47.4% 11.2%',
                    colorForeground: '210 40% 98%',
                },
            }}
        />
    )
}
