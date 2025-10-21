'use client'
import { useState } from 'react'
import { CreatePackage } from './CreatePkg/CreatePackage'
import { MemberPackageItems } from './MemberPkgItem'
import { Button, Collapsible, CollapsibleTrigger, CollapsibleContent, CardTitle } from '@/components/ui'
import { ChevronsUpDown } from 'lucide-react'

interface MemberPkgProps {
    params: { id: string; mid: string }
}
export function MemberPkg({ params }: MemberPkgProps) {
    const [open, setOpen] = useState<boolean>(true)

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
                <MemberPackageItems params={params} />
            </CollapsibleContent>
        </Collapsible>
    )
}
