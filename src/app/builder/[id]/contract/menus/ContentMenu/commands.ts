import { Command } from './types'

const Commands: Command[] = [
    {
        name: 'paragraph',
        label: 'Paragraph',
        iconName: 'Pilcrow',
        description: 'Plain text',
        aliases: ['p'],
        action: {
            type: 'paragraph'
        }
    },
    {
        name: 'heading2',
        label: 'Heading 1',
        iconName: 'Heading1',
        description: 'High priority section title',
        aliases: ['h1'],
        action: {
            type: 'heading',
            attrs: {
                level: 1,
            },
            content: [{ type: 'text', text: 'New Heading' }]
        }
    },
    {
        name: 'heading3',
        label: 'Heading 2',
        iconName: 'Heading2',
        description: 'Medium priority section title',
        aliases: ['h2'],
        action: {
            type: 'heading',
            attrs: {
                level: 2,
            },
            content: [{ type: 'text', text: 'New Heading' }]
        }
    },
    {
        name: 'heading',
        label: 'Heading 3',
        iconName: 'Heading3',
        description: 'Low priority section title',
        aliases: ['h3'],
        action: {
            type: 'heading',
            attrs: {
                level: 3,
            },
            content: [{ type: 'text', text: 'New Heading' }]
        }
    },
    {
        name: 'bulletList',
        label: 'Bullet List',
        iconName: 'List',
        description: 'Unordered list of items',
        aliases: ['ul'],
        action: {
            type: 'bulletList',
            content: [
                {
                    type: 'listItem',
                    content: [{ type: 'paragraph' }]
                },
            ],
        }
    },
    {
        name: 'numberedList',
        label: 'Numbered List',
        iconName: 'ListOrdered',
        description: 'Ordered list of items',
        aliases: ['ol'],
        action: {
            type: 'orderedList',

            content: [
                {
                    type: 'listItem',
                    content: [{ type: 'paragraph' }]
                },
            ],
        }
    },
]

export {
    Commands
}