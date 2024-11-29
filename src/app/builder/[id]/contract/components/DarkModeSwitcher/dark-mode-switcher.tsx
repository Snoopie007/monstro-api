import { Icon } from '@/components/icons'
import { Button } from '@/components/ui'
import { cn } from '@/libs/utils'
import { useTheme } from 'next-themes'
import React from 'react'

export function DarkModeSwitcher() {
    const { setTheme } = useTheme()
    return (
        <div className='fixed flex flex-row gap-1 bottom-10 border-foreground/20 right-8 z-50 border rounded-md overflow-hidden py-1 px-1.5'>
            <Button
                onClick={() => { setTheme('light') }}
                className={"text-foreground py-2 px-2.5 hover:bg-accent  h-auto bg-accent dark:bg-transparent"}
            >
                <Icon name="Sun" size={16} />
            </Button>
            <Button
                onClick={() => { setTheme('dark') }}
                className={"py-2 px-2.5 h-auto flex-1 bg-transparent hover:bg-accent text-foreground  dark:bg-accent"}
            >
                <Icon name="Moon" size={16} />
            </Button>
        </div>
    )
}
