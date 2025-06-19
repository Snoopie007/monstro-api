import { cn } from '@/libs/utils'
import { memo, useCallback } from 'react'
import { Editor } from '@tiptap/react'
import { TableOfContents } from '../TableOfContents'

export const Sidebar = memo(
    ({ editor, isOpen, onClose }: { editor: Editor; isOpen?: boolean; onClose: () => void }) => {
        const handlePotentialClose = useCallback(() => {
            if (window.innerWidth < 1024) {
                onClose()
            }
        }, [onClose])

        const windowClassName = cn(
            'fixed top-0 left-0  h-full  z-999 w-0 duration-300 transition-all',
            !isOpen && 'border-r-transparent',
            isOpen && 'w-80 border-r border-r-foreground/5',
        )

        return (
            <div className={windowClassName}>
                <div className="w-full h-full overflow-hidden">
                    <div className="w-full h-full p-6 overflow-auto text-nowrap">
                        <TableOfContents onItemClick={handlePotentialClose} editor={editor} />
                    </div>
                </div>
            </div>
        )
    },
)

Sidebar.displayName = 'TableOfContentSidepanel'