
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui'

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/libs/utils'
import { ChevronDown } from 'lucide-react'


const FontSizes = [
    { label: 'Smaller', value: '12px' },
    { label: 'Small', value: '14px' },
    { label: 'Medium', value: '' },
    { label: 'Large', value: '18px' },
    { label: 'Extra Large', value: '24px' },
]

export type FontSizePickerProps = {
    onChange: (value: string) => void // eslint-disable-line no-unused-vars
    value: string
}

export const FontSizePicker = ({ onChange, value }: FontSizePickerProps) => {
    const currentValue = FontSizes.find(size => size.value === value)
    const currentSizeLabel = currentValue?.label.split(' ')[0] || 'Medium'

    const selectSize = useCallback((size: string) => () => onChange(size), [onChange])

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={'ghost'} size="sm" className='text-xs hover:bg-foreground/5 rounded-md font-bold'>
                    {currentSizeLabel}
                    <ChevronDown className="size-3.5 ml-1 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                {FontSizes.map(size => (
                    <DropdownMenuItem
                        className={cn({ 'bg-foreground/5 font-medium': size.value === value })}
                        onClick={selectSize(size.value)}
                        key={`${size.label}${size.value}`}
                    >
                        <span style={{ fontSize: size.value }}>{size.label}</span>
                    </DropdownMenuItem>
                ))}

            </DropdownMenuContent>
        </DropdownMenu>

    )
}