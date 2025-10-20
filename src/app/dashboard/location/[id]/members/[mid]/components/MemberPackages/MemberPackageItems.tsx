'use client'

import { ScrollArea, Skeleton, Badge } from '@/components/ui'
import {
    Item,
    ItemContent,
    ItemDescription,
    ItemTitle,
} from '@/components/ui/item'
import { useMemberPackages } from '@/hooks'
import { formatAmountForDisplay } from '@/libs/utils'
import { MemberPackage } from '@/types/member'
import { format } from 'date-fns'

export const MemberPackageItems = ({
    params,
}: {
    params: { id: string; mid: string }
}) => {
    const { packages, isLoading } = useMemberPackages(params.id, params.mid)

    if (isLoading) {
        return (
            <div className="flex flex-col gap-2">
                <Skeleton className="w-full h-24 " />
                <Skeleton className="w-full h-24 " />
                <Skeleton className="w-full h-24 " />
            </div>
        )
    }

    const renderPackages = () => {
        return packages && packages.length > 0 ? (
            packages.map((pkg: MemberPackage) => {
                const attended = pkg.totalClassAttended ?? 0
                const remaining = (pkg.totalClassLimit ?? 0) - attended
                return (
                    <li key={pkg.id}>
                        <Item
                            variant="muted"
                            className="hover:bg-muted-foreground/5"
                        >
                            <ItemContent>
                                <ItemTitle>
                                    {pkg.plan?.name}
                                    {' • '}
                                    <span className="text-muted-foreground text-xs">
                                        {formatAmountForDisplay(
                                            (pkg.plan?.price || 0) / 100,
                                            pkg.plan?.currency || 'USD'
                                        )}
                                    </span>
                                </ItemTitle>
                                <ItemDescription>
                                    <div className="flex items-center justify-between gap-2">
                                        <span>
                                            {format(
                                                pkg.startDate,
                                                'MMM d, yyyy'
                                            )}{' '}
                                            -{' '}
                                            {pkg.expireDate
                                                ? format(
                                                      pkg.expireDate,
                                                      'MMM d, yyyy'
                                                  )
                                                : 'N/A'}{' '}
                                            • {attended} / {pkg.totalClassLimit}{' '}
                                            classes
                                        </span>
                                        <Badge pkg={pkg.status} size={'tiny'}>
                                            {pkg.status}
                                        </Badge>
                                    </div>
                                </ItemDescription>
                            </ItemContent>
                        </Item>
                    </li>
                )
            })
        ) : (
            <li>
                <Item variant="muted" className="hover:bg-muted-foreground/5">
                    <ItemContent>
                        <ItemTitle>No packages found</ItemTitle>
                    </ItemContent>
                </Item>
            </li>
        )
    }

    return (
        <div className="mb-4">
            <ScrollArea className="max-h-[350px] w-full">
                <ul className="flex flex-col gap-2">{renderPackages()}</ul>
            </ScrollArea>
        </div>
    )
}
