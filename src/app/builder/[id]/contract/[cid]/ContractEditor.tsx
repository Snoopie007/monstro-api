'use client'
import { EditorContent } from '@tiptap/react'
import { TopMenu, ContentMenu } from '../menus'
import { useBlockEditor } from '../hooks/useBlockEditor'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Sidebar } from '../components'
import { useMemo, useState } from 'react'

import { Contract } from '@/types'
import { Input } from '@/components/forms'
import { Skeleton } from '@/components/ui'

interface ContractEditorProps {
    contractRef: Contract,
    locationId: string
}


export default function ContractEditor({ contractRef, locationId }: ContractEditorProps) {
    const { editor } = useBlockEditor(contractRef.content)
    const [contract, setContract] = useState<Contract | null>(contractRef)
    const [isOpen, setIsOpen] = useState(false)
    const sidebar = useMemo(() => {
        return {
            isOpen,
            open: () => setIsOpen(true),
            close: () => setIsOpen(false),
            toggle: () => setIsOpen(prev => !prev),
        }
    }, [isOpen])

    if (!editor || !contract) {
        return (
            <Skeleton className='h-full w-full' />
        )
    }

    return (
        <>
            <Sidebar isOpen={sidebar.isOpen} onClose={sidebar.close} editor={editor} />
            <TopMenu contract={contract} editor={editor} isSidebarOpen={sidebar.isOpen} toggleSidebar={sidebar.toggle} locationId={locationId} />
            <div className='flex flex-col h-full overflow-hidden'>

                <ScrollArea className='h-full pt-18  pb-2 flex-1'>
                    <div className=' max-w-2xl h-full rounded-sm m-auto w-full'>
                        <Input
                            className='font-semibold focus-visible:ring-0 rounded-none border-none outline-hidden block text-lg h-auto py-0'
                            defaultValue={`${contractRef.title ? contractRef.title : ''} #${contractRef.id}`} onChange={(v) => {
                                setContract({ ...contract, title: v.target.value })
                            }}
                        />
                        <div className='mt-6'>
                            <ContentMenu editor={editor} />
                            <EditorContent editor={editor} />
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </>
    )
}
