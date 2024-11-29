'use client'
import { EditorContent } from '@tiptap/react'
import { TopMenu, ContentMenu } from '../menus'
import { useBlockEditor } from '../hooks/use-block-editor'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sidebar } from '../components/Sidebar'
import { useMemo, useState } from 'react'
import { DarkModeSwitcher } from '../components/DarkModeSwitcher'
import { Contract } from '@/types'
import { Input } from '@/components/forms'

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
            <div className='h-full w-full flex items-center justify-center'>
                <p>Loading...</p>
            </div>
        )
    }

    return (
        <>
            <Sidebar isOpen={sidebar.isOpen} onClose={sidebar.close} editor={editor} />
            <div className='flex flex-col flex-1 h-full overflow-hidden'>
                <TopMenu contract={contract} editor={editor} isSidebarOpen={sidebar.isOpen} toggleSidebar={sidebar.toggle} locationId={locationId} />
                <ScrollArea className='h-[100vh-50px] pt-10  pb-2 flex-1'>
                    <div className=' max-w-2xl h-full rounded-sm m-auto w-full font-roboto'>
                        <Input
                            className='font-semibold focus-visible:ring-0 rounded-none outline-none border-transparent block text-3xl px-8'
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
            <DarkModeSwitcher />
        </>
    )
}
