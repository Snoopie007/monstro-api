import { cn } from '@/libs/utils'
import { icons } from 'lucide-react'
import { memo } from 'react'

export type IconProps = {
    name: keyof typeof icons
    className?: string
    strokeWidth?: number,
    size?: number
}

export const Icon = memo(({ name, className, strokeWidth, size = 16 }: IconProps) => {
    const IconComponent = icons[name]
    if (!IconComponent) {
        return null
    }
    return <IconComponent size={size} className={cn(className)} strokeWidth={strokeWidth || 2.5} />
})

Icon.displayName = 'Icon'