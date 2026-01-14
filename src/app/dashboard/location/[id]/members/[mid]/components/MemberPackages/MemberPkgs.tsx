'use client'
import { useState } from 'react'
import { CreatePackage } from './CreatePkg/CreatePackage'
import { MemberPackageItem } from './MemberPkgItem'
import {
    Button, Collapsible, CollapsibleTrigger, CollapsibleContent, CardTitle,
    EmptyTitle, Empty, EmptyHeader, EmptyDescription, EmptyMedia
} from '@/components/ui'
import { ChevronsUpDown, CircleFadingPlusIcon } from 'lucide-react'
import { useMemberPackages } from '@/hooks'
import { MemberPackage } from '@/types/member'

interface MemberPkgProps {
    params: { id: string; mid: string }
}
export function MemberPkg({ params }: MemberPkgProps) {
    const { packages, isLoading } = useMemberPackages(params.id, params.mid)
    return (
        <div className='space-y-2'>
            <CreatePackage params={params} />

            <div className='space-y-2'>
                {packages && packages.length > 0 ? packages.map((pkg: MemberPackage) => (
                    <MemberPackageItem key={pkg.id} pkg={pkg} />
                )) : (
                    <Empty variant="border">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <CircleFadingPlusIcon className="size-5" />
                            </EmptyMedia>
                            <EmptyTitle>No packages found</EmptyTitle>
                            <EmptyDescription>Packages will appear here when they are created</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </div>
        </div>
    )
}
