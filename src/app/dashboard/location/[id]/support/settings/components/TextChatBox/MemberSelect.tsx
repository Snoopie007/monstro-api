'use client'
import React, { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Member } from '@/types'
import { ChevronDown, Loader2, Search, User } from 'lucide-react'
import { tryCatch } from '@/libs/utils'
import { toast } from 'react-toastify'
import { Input } from '@/components/forms'
import { Skeleton } from '@/components/ui/skeleton'

export function ContactSelect({ lid }: { lid: string }) {
    const [open, setOpen] = useState(false)
    const [contacts, setContacts] = useState<Member[]>([])

    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')
    const [filteredContacts, setFilteredContacts] = useState<Member[]>([])

    const handleContactChange = (open: boolean) => {
        if (open) {

            if (contacts.length === 0) {
                fetchContacts()
            }
        }
        setOpen(open)
    }


    async function fetchContacts() {
        if (contacts.length > 0) return
        setLoading(true)
        const { result, error } = await tryCatch(
            fetch(`/api/protected/locs/${lid}/contacts?limit=5`)
        )
        setLoading(false)
        if (error || !result) return
        const data = await result.json()
        setContacts(data)
        setFilteredContacts(data)
    }

    return (
        <Popover open={open} onOpenChange={handleContactChange}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size={"xs"}
                    className="flex flex-row items-center justify-between gap-2 hover:bg-foreground/5 rounded-md w-[160px]">
                    <div className="flex flex-row items-center gap-1">
                        <User className="size-3.5" />
                        {member ? <span className="text-xs font-medium truncate">{member?.firstName} {member?.lastName}</span> : 'Select Contact'}
                    </div>
                    <ChevronDown className="size-3.5" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 border-foreground/10 overflow-hidden" align='end'>
                <div className="space-y-0">
                    <div className='border-b border-foreground/10 flex flex-row gap-0.5 items-center px-2'>
                        <Search className='size-3 text-foreground/50' />
                        <Input
                            placeholder="Search contacts"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className='border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-xs placeholder:text-xs px-0'
                        />
                    </div>
                    <div className="flex flex-col gap-2 p-1">
                        {loading ? (
                            <>
                                <Skeleton className='h-6 w-full' />
                                <Skeleton className='h-6 w-full' />
                            </>
                        ) : (
                            filteredContacts.map((contact) => (
                                <div key={contact.id} className='text-xs font-medium cursor-pointer hover:bg-foreground/5 rounded-md px-2 py-1.5'
                                    onClick={() => {
                                        setMember(contact)
                                        setOpen(false)
                                    }}
                                >
                                    {contact.firstName} {contact.lastName}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
