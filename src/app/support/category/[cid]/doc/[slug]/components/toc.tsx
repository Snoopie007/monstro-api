'use client'
import React, { useState } from 'react'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui"
import { Plus } from 'lucide-react'
import { DocToC } from '@/types/admin'
import { cn } from '@/libs/utils'

export function MobileTOC({ toc }: { toc: DocToC[] }) {
    const [open, setOpen] = useState(true)

    return (
        <div className="md:hidden border-2 border-black rounded-sm p-4 mb-5">
            <Collapsible open={open} onOpenChange={setOpen}>
                <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between text-lg font-bold font-poppins cursor-pointer">
                        Content
                        <Plus className={cn("h-5 w-5 stroke-black stroke-[3px]", open && "rotate-45 transition-all")} />
                        <span className="sr-only">Toggle</span>
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 border-t pt-2">
                    {toc.map(item => (
                        <a
                            key={item.slug}
                            href={`#${item.slug}`}
                            className="block py-1.5 leading-6 hover:font-semibold hover:text-indigo-600"
                        >
                            {item.headline}
                        </a>
                    ))}
                </CollapsibleContent>
            </Collapsible>
        </div>
    )
}
