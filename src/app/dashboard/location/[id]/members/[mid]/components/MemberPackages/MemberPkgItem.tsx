'use client'

import { Badge } from '@/components/ui'
import {
    Item,
    ItemMedia,
    ItemContent,
    ItemTitle,
    ItemActions,
} from '@/components/ui/item'
import { formatAmountForDisplay } from '@/libs/utils'
import { MemberPackage } from '@/types/member'
import { format } from 'date-fns'
import { EllipsisVerticalIcon } from 'lucide-react'
import { Button } from '@/components/ui'


interface MemberPackageItemProps {
    pkg: MemberPackage
}
export function MemberPackageItem({ pkg }: MemberPackageItemProps) {
    const attended = pkg.totalClassAttended ?? 0
    const remaining = (pkg.totalClassLimit ?? 0) - attended
    return (
        <Item variant="muted" className='p-3'>
            <ItemMedia>
                <Badge pkg={pkg.status} className='capitalize'>
                    {pkg.status}
                </Badge>
            </ItemMedia>
            <ItemContent className='flex flex-row justify-between gap-2 items-center'>
                <span>  {pkg.plan?.name.substring(0, 10)}...</span>

                <span >
                    {formatAmountForDisplay(
                        (pkg.plan?.price || 0) / 100,
                        pkg.plan?.currency || 'usd'
                    )}
                </span>
                <span>
                    {format(pkg.startDate, 'MMM d, yyyy')} -{' '}
                    {pkg.expireDate ? format(pkg.expireDate, 'MMM d, yyyy') : 'n/a'}


                </span>
                <span>
                    {attended} / {pkg.totalClassLimit}
                </span>
            </ItemContent>
            <ItemActions>
                <Button variant="ghost" size="icon" className="size-6 ">
                    <EllipsisVerticalIcon className="size-4" />
                </Button>
            </ItemActions>
        </Item>
    )

}
