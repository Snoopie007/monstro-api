'use client'
import { useState } from 'react'
import { CreatePackage } from './CreatePkg/CreatePackage'
import { MemberPackageItem } from './MemberPkgItem'
import { Button, Collapsible, CollapsibleTrigger, CollapsibleContent, CardTitle } from '@/components/ui'
import { ChevronsUpDown } from 'lucide-react'
import { useMemberPackages } from '@/hooks'
import { MemberPackage } from '@/types/member'

interface MemberPkgProps {
    params: { id: string; mid: string }
}
export function MemberPkg({ params }: MemberPkgProps) {
    const [open, setOpen] = useState<boolean>(true)
    const { packages, isLoading } = useMemberPackages(params.id, params.mid)
    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <div className=' space-y-0 flex flex-row justify-between items-center'>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="hover:bg-transparent gap-1 px-0">
                        <CardTitle className='text-sm font-medium mb-0'>Packages</CardTitle>
                        <ChevronsUpDown className="size-4" />
                        <span className="sr-only">Toggle</span>
                    </Button>
                </CollapsibleTrigger>
                <CreatePackage params={params} />
            </div>
            <CollapsibleContent>
                {packages && packages.length > 0 ? packages.map((pkg: MemberPackage) => (
                    <MemberPackageItem key={pkg.id} pkg={pkg} />
                )) : (
                    <div>
                        <p className="text-muted-foreground">No packages found</p>
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    )
}
