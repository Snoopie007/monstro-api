
import { useEditor } from '@tiptap/react'
import type { AnyExtension } from '@tiptap/core'
import ExtensionKit from '../extensions/ExtensionKit'

export const useBlockEditor = (content: string | null) => {

    const editor = useEditor({
        autofocus: true,
        immediatelyRender: false,
        content,
        onCreate: ctx => {
            ctx.editor.commands.focus('start', { scrollIntoView: true })
        },
        extensions: [
            ...ExtensionKit(),
        ].filter((e): e is AnyExtension => e !== undefined),
        editorProps: {
            attributes: {
                class: 'min-h-full ',
                autocomplete: 'off',
                autocorrect: 'off',
                autocapitalize: 'off',
            },

        },
    })

    return { editor }
}