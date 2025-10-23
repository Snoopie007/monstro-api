'use client'

import { Badge, Button } from '@/components/ui'
import { formatAmountForDisplay } from '@/libs/utils'
import { MemberPackage } from '@/types/member'
import { format } from 'date-fns'
import { EllipsisVerticalIcon } from 'lucide-react'
import { InfoField } from '../InfoField'
interface MemberPackageItemProps {
    pkg: MemberPackage
}



export function MemberPackageItem({ pkg }: MemberPackageItemProps) {
    const attended = pkg.totalClassAttended ?? 0
    const remaining = (pkg.totalClassLimit ?? 0) - attended

    return (
        <div className="bg-muted/50 rounded-lg px-4 py-3 space-y-2">
            <div className="flex flex-row justify-between items-center">
                <div className="font-medium flex items-center gap-1.5 text-sm">
                    {pkg.plan?.name}
                </div>
                <div>
                    <Button variant="ghost" size="icon" className="size-6">
                        <EllipsisVerticalIcon className="size-4" />
                    </Button>
                </div>
            </div>
            <div className="space-y-4 py-2">
                <div className="grid grid-cols-3 items-center">
                    <InfoField label="Duration">
                        {format(pkg.startDate, 'MMM d, yyyy')} {' - '}
                        {pkg.expireDate ? format(pkg.expireDate, 'MMM d, yyyy') : 'n/a'}
                    </InfoField>
                    <InfoField label="Price">
                        {formatAmountForDisplay(
                            (pkg.plan?.price || 0) / 100,
                            pkg.plan?.currency || 'usd'
                        )}
                    </InfoField>
                    <InfoField label="Remaining">
                        {remaining} classes
                    </InfoField>
                </div>

            </div>
        </div>
    )
}
