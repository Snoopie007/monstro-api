'use client'

import { Inbox } from '@novu/nextjs'
import { useTheme } from 'next-themes'
import { Inbox as InboxIcon } from 'lucide-react'
import { Button } from '../ui/button'
import Link from 'next/link'
import { ExtendedUser } from '@/types/next-auth'

const lightAppearance = {
    variables: {
        colorBackground: '#FCFCFC',
        colorForeground: '#1A1523',
        colorPrimary: '#615FFF',
        colorPrimaryForeground: '#ffffff',
        colorSecondary: '#D9DADC',
        colorSecondaryForeground: '#1A1523',
        colorCounter: '#E5484D',
        colorCounterForeground: 'white',
        colorNeutral: 'black',
        borderRadius: '0.175rem',
    },
}

const darkAppearance = {
    variables: {
        colorBackground: '#09090B',
        colorForeground: '#FCFCFC',
        colorPrimary: '#615FFF',
        colorPrimaryForeground: '#ffffff',
        borderRadius: '0.175rem',
    },
}

export function NovuInbox({ user }: { user: ExtendedUser }) {
    const appId = process.env.NEXT_PUBLIC_NOVU_APP_IDENTIFIER
    const { theme } = useTheme()

    if (!process.env.NEXT_PUBLIC_NOVU_APP_IDENTIFIER)
        throw new Error('NEXT_PUBLIC_NOVU_APP_IDENTIFIER is not set')

    if (!appId || !user?.id) return null

    return (
        <Inbox
            applicationIdentifier={appId}
            subscriberId={user?.id}
            appearance={{
                elements: {
                    inbox__popoverTrigger: 'nt-p-0 size-6 hover:bg-slate-400',
                    preferences__button: {
                        display: 'none',
                    },
                },
                icons: {
                    bell: () => <InboxIcon size={16} />,
                },
                ...(theme === 'dark' ? darkAppearance : lightAppearance),
            }}
            renderCustomActions={(notification) => {
                return (
                    <div
                        style={{
                            display: 'flex',
                            gap: '10px',
                            marginTop: '12px',
                        }}
                    >
                        {notification.primaryAction && (
                            <Button
                                asChild
                                variant="link"
                                size="xs"
                                className="px-0"
                            >
                                <Link
                                    href={
                                        notification.primaryAction.redirect
                                            ?.url || ''
                                    }
                                >
                                    {notification.primaryAction.label}
                                </Link>
                            </Button>
                        )}
                        {notification.secondaryAction && (
                            <Button
                                asChild
                                variant="link"
                                size="xs"
                                className="px-0"
                            >
                                <Link
                                    href={
                                        notification.secondaryAction.redirect
                                            ?.url || ''
                                    }
                                >
                                    {notification.secondaryAction.label}
                                </Link>
                            </Button>
                        )}
                    </div>
                )
            }}
        />
    )
}
