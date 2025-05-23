'use client'
import { Input } from '@/components/forms'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { cn } from '@/libs/utils'
import { SupportCategory } from '@/types/admin'
import { CircleHelp, Command, Search, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'

const HELP_TEXT_PLACEHOLDERS = [
    "How can we help?",
    "Need help with setup?",
    "Looking for documentation?",
    "Have a question?"
] as const

export function DocSearch({ categories }: { categories: SupportCategory[] | undefined }) {
    const [filteredDocs, setFilteredDocs] = useState<SupportCategory[] | undefined>(categories)
    const [search, setSearch] = useState('')
    const [open, setOpen] = useState(false)

    const handleSearch = useCallback((searchTerm: string) => {
        if (!searchTerm || searchTerm.length < 3) {
            setFilteredDocs(categories)
            return
        }

        const searchLower = searchTerm.toLowerCase()
        const filtered = categories?.reduce<SupportCategory[]>((acc, category) => {
            const filteredMetas = category.metas?.filter(meta =>
                meta.title.toLowerCase().includes(searchLower) ||
                meta.description?.toLowerCase().includes(searchLower) ||
                meta.tags?.some(tag => tag.toLowerCase().includes(searchLower))
            )

            if (filteredMetas?.length) {
                acc.push({ ...category, metas: filteredMetas })
            }
            return acc
        }, [])

        setFilteredDocs(filtered)
    }, [categories])

    useEffect(() => {
        handleSearch(search)
    }, [search, handleSearch])

    const handleClose = () => setOpen(false)
    const handleOpen = () => setOpen(true)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                handleOpen()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const placeholderText = HELP_TEXT_PLACEHOLDERS[Math.floor((Date.now() / 2000) % 4)]

    return (
        <div className='relative w-[500px]'>
            <div onClick={handleOpen}
                className={cn(
                    'border-foreground/5 cursor-pointer flex items-center gap-2 text-sm rounded-sm w-full border justify-start p-3',
                    'hover:bg-background transition-all duration-300 bg-background/90'
                )}
            >
                <Search size={16} />
                <span>{placeholderText}</span>
                <div className='ml-auto bg-foreground/5 rounded-md px-3 py-1 text-xs flex items-center gap-2'>
                    <Command size={14} /> k
                </div>
            </div>
            {open && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={handleClose}
                    />
                    <div className={cn(
                        'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background rounded-lg',
                        'animate-in fade-in-0 duration-300 border-foreground/10 overflow-hidden w-full max-w-2xl max-h-[80vh] z-50'
                    )}>
                        <div className='flex items-center flex-row px-4'>
                            <Search size={16} />
                            <Input
                                placeholder='Search...'
                                className='w-full border-none focus-visible:ring-0 focus-visible:ring-offset-0 h-12'
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                            <button onClick={handleClose}>
                                <X size={16} className="text-foreground/50 hover:text-foreground transition-colors" />
                            </button>
                        </div>
                        <div className='bg-foreground/5 rounded-full h-[1px] w-full' />
                        <div className='pt-4'>
                            {filteredDocs && filteredDocs.length > 0 ? (
                                <ScrollArea className='h-[500px] px-4'>
                                    {filteredDocs.map((category) => (
                                        <CategoryItem
                                            key={category.name}
                                            category={category}
                                            onSelect={handleClose}
                                        />
                                    ))}
                                </ScrollArea>
                            ) : (
                                <div className='font-medium text-center text-sm py-4'>
                                    No help docs found.
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

function CategoryItem({ category, onSelect }: {
    category: SupportCategory,
    onSelect: () => void
}) {
    return (
        <div className='space-y-1 text-left mb-4'>
            <div className='text-foreground/50 text-xs uppercase font-medium'>
                {category.name}
            </div>
            <ul className='space-y-2'>
                {category.metas?.map((meta) => (
                    <li key={meta.id} className="cursor-pointer">
                        <Link
                            href={`/category/${category.name.toLowerCase()}/doc/${meta.file}`}
                            className="flex gap-2 rounded-md py-2 px-4 hover:bg-foreground/5 flex-row items-start justify-start w-full"
                            onClick={onSelect}
                        >
                            <div>
                                <CircleHelp size={16} className='mt-1' />
                            </div>
                            <div className='flex flex-col gap-1'>
                                <div className="text-sm font-bold">{meta.title}</div>
                                <div className="text-xs text-muted-foreground">{meta.description}</div>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}
