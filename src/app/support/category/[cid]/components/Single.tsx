'use client'
import { Input } from '@/components/forms'
import { SupportCategory, SupportDocMeta } from '@/types/admin'
import { CircleHelp } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export function SingleCategory({ category }: { category: SupportCategory | undefined }) {
    const [filteredDocs, setFilteredDocs] = useState<SupportDocMeta[] | []>()

    const [search, setSearch] = useState<string>('')
    useEffect(() => {
        setFilteredDocs(category?.metas)
    }, [category])

    useEffect(() => {
        if (!category?.metas) return;
        if (!search) {
            setFilteredDocs(category.metas);
            return;
        }
        const filtered = category.metas.filter(doc =>
            doc.title.toLowerCase().includes(search.toLowerCase()) ||
            doc.description?.toLowerCase().includes(search.toLowerCase()) ||
            doc.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
        );
        setFilteredDocs(filtered);
    }, [search, category?.metas])

    return (
        <div className='space-y-4'>
            <div className='space-y-2'>
                <h1 className='font-semibold text-xl w-full '>
                    {category?.name}
                </h1>
                <Input placeholder='Search help docs'
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className='border-foreground/10 bg-foreground/5  text-sm rounded-md' />
            </div>
            <div>
                {filteredDocs && filteredDocs.length > 0 ? (
                    <ul className='space-y-2' >
                        {filteredDocs.map((doc) => (
                            <li key={doc.id} className="cursor-pointer  ">
                                <Link href={`/support/category/${category?.name.toLocaleLowerCase()}/doc/${doc.file}`}
                                    className="flex gap-2  p-4 bg-foreground/10 flex-row  rounded-md  justify-start w-full">
                                    <div className='flex-initial'>
                                        <CircleHelp size={16} className='mt-1' />
                                    </div>
                                    <div className='space-y-1 flex-1'>
                                        <div className="text-base font-semibold">{doc.title}</div>
                                        <div className="text-sm   text-muted-foreground ">{doc.description}</div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className='font-normal text-sm text-muted-foreground'>
                        No help docs found.
                    </div>
                )}
            </div>
        </div>
    )
}

