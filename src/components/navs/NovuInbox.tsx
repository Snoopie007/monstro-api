import { Inbox } from '@novu/nextjs'

import { Button } from '@/components/ui/button'
import { Inbox as InboxIcon } from 'lucide-react'

export function NovuInbox() {
    return (
        <Inbox
            applicationIdentifier="g62OC-iQ2LHU"
            subscriberId="68ed218d387ecafce7c7861a"
            appearance={{
                variables: {
                    colorPrimary: '#DD2450',
                    colorForeground: '#0E121B',
                },
            }}
        />
    )
}
