'use client'

import { Badge, Button } from '@/components/ui'
import { formatAmountForDisplay } from '@/libs/utils'
import { MemberPackage } from '@/types/member'
import { format } from 'date-fns'
import { EllipsisVerticalIcon } from 'lucide-react'

interface MemberPackageItemProps {
    pkg: MemberPackage
}

function StatusDot({ status }: { status: string }) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-500'
            case 'expired':
                return 'bg-red-500'
            case 'used':
                return 'bg-gray-500'
            default:
                return 'bg-gray-500'
        }
    }

    return (
        <div className={`size-2.5 rounded-full ${getStatusColor(status)}`} />
    )
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
                <div className="flex flex-row justify-between items-center">
                    <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Duration</div>
                        <span className="text-sm font-medium">
                            {format(pkg.startDate, 'MMM d, yyyy')} {' - '}
                            {pkg.expireDate ? format(pkg.expireDate, 'MMM d, yyyy') : 'n/a'}
                        </span>
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Price</div>
                        <span className="text-sm font-medium">
                            {formatAmountForDisplay(
                                (pkg.plan?.price || 0) / 100,
                                pkg.plan?.currency || 'usd'
                            )}
                        </span>
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Remaining</div>
                        <span className="text-sm font-medium">
                            {remaining} classes
                        </span>
                    </div>
                </div>

            </div>
        </div>
    )
}
