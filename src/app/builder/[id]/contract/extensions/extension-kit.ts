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


export const ExtensionKit = () => [
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

export default ExtensionKit;