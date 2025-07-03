
import { Dispatch, SetStateAction } from 'react'
import { Editor } from '@tiptap/react'
import { Node } from '@tiptap/pm/model'

export type Command = {
    name: string
    label: string
    description: string
    aliases?: string[]
    icon: React.ReactNode
    action: CommandAction
}

export type CommandData = {
    currentNode: Node | null;
    currentNodePos: number;
    setCurrentNode: Dispatch<SetStateAction<Node | null>>;
    setCurrentNodePos: Dispatch<SetStateAction<number>>;
    handleNodeChange: (data: {
        node: Node | null;
        editor: Editor;
        pos: number;
    }) => void;
}

export type CommandAction = {
    type: string
    attrs?: {
        level: number
    }
    content?: Content[]
}

type Content = {
    type: string
    text?: string
    content?: Content[]
}
