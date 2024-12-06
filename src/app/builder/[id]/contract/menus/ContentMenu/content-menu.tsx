import { Icon } from '@/components/icons'

import DragHandle from '@tiptap-pro/extension-drag-handle-react'
import { Editor } from '@tiptap/react'

import { useData } from './hooks/use-data'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Toolbar } from '../../components'
import { useEffect, useState } from 'react'
import { Commands } from "./commands"
import useContentMenuActions from "./hooks/use-content-menu-auction"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

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
                            <Icon name="Plus" />
                        </Toolbar.Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className='border border-foreground/10 w-[250px]' align='start'>


                        {Commands.map((commpand, index) => (
                            <DropdownMenuItem
                                key={`${commpand.name}-${index}`}
                                onClick={() => actions.handleAdd(commpand.action)}
                                className="flex flex-row items-center gap-2 cursor-pointer"
                            >
                                <Icon name={commpand.iconName} />
                                <span>{commpand.label}</span>
                            </DropdownMenuItem>
                        ))}

                    </DropdownMenuContent>
                </DropdownMenu>
                <Popover open={menuOpen} onOpenChange={setMenuOpen} >
                    <PopoverTrigger asChild>
                        <Toolbar.Button  >
                            <Icon name="GripVertical" />
                        </Toolbar.Button>
                    </PopoverTrigger>
                    <PopoverContent className='border px-1 py-2 rounded-sm border-foreground/10 w-[250px]' align='start'>
                        <div className='flex flex-col '>

                            <Toolbar.Button variant='menu' onClick={actions.resetTextFormatting}>
                                <Icon name="RemoveFormatting" />
                                Clear formatting
                            </Toolbar.Button>
                            <Toolbar.Button variant='menu' onClick={actions.copyNodeToClipboard}>
                                <Icon name="Clipboard" />
                                Copy to clipboard
                            </Toolbar.Button>
                            <Toolbar.Button variant='menu' onClick={actions.duplicateNode}>
                                <Icon name="Copy" />
                                Duplicate
                            </Toolbar.Button>
                            <Toolbar.Divider horizontal />
                            <Toolbar.Button variant='menu' className='bg-red-600 hover:bg-red-500 dark:hover:text-red-500' onClick={actions.deleteNode}>
                                <Icon name="Trash2" />
                                Delete
                            </Toolbar.Button>
                        </div>


                    </PopoverContent>
                </Popover>
            </div>
        </DragHandle >
    )
}