'use client'
import { Input } from '@/components/forms'
import { useState } from 'react'
import { CreatePackage } from './CreatePkg/CreatePackage'
import { MemberPackageItems } from './MemberPackageItems'

export function MemberPackages({
    params,
}: {
    params: { id: string; mid: string }
}) {
    const [search, setSearch] = useState<string>('')

    return (
        // <div className="space-y-0">
        //     <div className="w-full flex flex-row items-center px-4 py-2 bg-foreground/5 gap-2">
        //         <Input
        //             placeholder="Search packages..."
        //             className="w-auto bg-background border-foreground/10 h-9"
        //             value={search}
        //             onChange={(e) => setSearch(e.target.value)}
        //         />
        //         <CreatePackage params={params} />
        //     </div>
        <div className="mb-4 px-4">
            <div className="flex flex-row items-center gap-2 mb-2">
                <h2 className="text-md text-muted-foreground font-medium">
                    Packages
                </h2>
                <CreatePackage params={params} />
            </div>
            <MemberPackageItems params={params} />
        </div>
    )
}
