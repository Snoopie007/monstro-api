import { MentionNodeAttrs, MentionOptions } from '@tiptap/extension-mention';
import { Node } from '@tiptap/pm/model';
import {
    FontSize,
    Placeholder,
    StarterKit,
    TextAlign,
    TextStyle,
    Underline,
    Heading,
    Variable,
    VariableOptions,
    TableOfContents
} from '.'


const ExtensionKit = () => [
    StarterKit.configure({
        heading: false,
        horizontalRule: false,
    }),
    Underline,
    Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
    }),
    TextAlign.extend({
        addKeyboardShortcuts() {
            return {}
        },
    }).configure({
        types: ['heading', 'paragraph'],
    }),
    Variable.configure({
        HTMLAttributes: {
            class: 'variable',
        },
        suggestion: VariableOptions
    }),
    TextStyle,
    FontSize,
    TableOfContents,
    Placeholder.configure({
        placeholder: 'Write or paste your contract here...',
    })
]



const AIExtensionKit = () => [
    StarterKit.configure({
        heading: false,
        horizontalRule: false,
    }),

    Variable.configure({
        HTMLAttributes: {
            class: 'variable',
        },
        renderText(props: { options: MentionOptions<any, MentionNodeAttrs>; node: Node }) {
            return `@${props.node.attrs.value}`
        },
        suggestion: VariableOptions
    }),
    TextStyle,
]





export { ExtensionKit, AIExtensionKit }