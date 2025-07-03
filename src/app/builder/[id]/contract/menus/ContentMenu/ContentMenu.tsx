
import DragHandle from '@tiptap-pro/extension-drag-handle-react'
import { Editor } from '@tiptap/react'

import { useData } from './hooks/useData'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Toolbar } from '../../components'
import { useEffect, useState } from 'react'
import { Commands } from "./commands"
import useContentMenuActions from "./hooks/useContentMenuAuction"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ClipboardIcon, CopyIcon, GripVerticalIcon, PlusIcon, Trash2, RemoveFormatting } from 'lucide-react'


export type ContentMenuProps = {
    editor: Editor
}


export function ContentMenu({ editor }: ContentMenuProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [createMenuOpen, setCreateMenuOpen] = useState(false)

    const data = useData()
    const actions = useContentMenuActions(editor, data.currentNode, data.currentNodePos)

    useEffect(() => {
        if (menuOpen) {
            editor.commands.setMeta('lockDragHandle', true)
        } else {
            editor.commands.setMeta('lockDragHandle', false)
        }
    }, [editor, menuOpen])

    return (
        <DragHandle
            pluginKey="ContentMenu"
            editor={editor}
            onNodeChange={data.handleNodeChange}
            tippyOptions={{
                offset: [-2, 16],
                zIndex: 99,
            }}
        >
            <div className="flex items-center gap-0.5">
                <DropdownMenu open={createMenuOpen} onOpenChange={setCreateMenuOpen} >
                    <DropdownMenuTrigger asChild>
                        <Toolbar.Button>
                            <PlusIcon className='size-4' />
                        </Toolbar.Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className='border border-foreground/10 w-[250px]' align='start'>


                        {Commands.map((commpand, index) => (
                            <DropdownMenuItem
                                key={`${commpand.name}-${index}`}
                                onClick={() => actions.handleAdd(commpand.action)}
                                className="flex flex-row items-center gap-2 cursor-pointer"
                            >
                                {commpand.icon}
                                <span>{commpand.label}</span>
                            </DropdownMenuItem>
                        ))}

                    </DropdownMenuContent>
                </DropdownMenu>
                <Popover open={menuOpen} onOpenChange={setMenuOpen} >
                    <PopoverTrigger asChild>
                        <Toolbar.Button  >
                            <GripVerticalIcon className='size-4' />
                        </Toolbar.Button>
                    </PopoverTrigger>
                    <PopoverContent className='border px-1 py-2 rounded-sm border-foreground/10 w-[250px]' align='start'>
                        <div className='flex flex-col '>

                            <Toolbar.Button variant='menu' onClick={actions.resetTextFormatting}>
                                <RemoveFormatting />
                                C   lear formatting
                            </Toolbar.Button>
                            <Toolbar.Button variant='menu' onClick={actions.copyNodeToClipboard}>
                                <ClipboardIcon className='size-4' />
                                Copy to clipboard
                            </Toolbar.Button>
                            <Toolbar.Button variant='menu' onClick={actions.duplicateNode}>
                                <CopyIcon className='size-4' />
                                Duplicate
                            </Toolbar.Button>
                            <Toolbar.Divider horizontal />
                            <Toolbar.Button variant='menu' className='bg-red-600 hover:bg-red-500 dark:hover:text-red-500' onClick={actions.deleteNode}>
                                <Trash2 />
                                Delete
                            </Toolbar.Button>
                        </div>


                    </PopoverContent>
                </Popover>
            </div>
        </DragHandle >
    )
}