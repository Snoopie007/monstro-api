import { Command } from './types'
import { Pilcrow, Heading1, Heading2, Heading3, List, ListOrdered } from 'lucide-react'
const Commands: Command[] = [
    {
        name: 'paragraph',
        label: 'Paragraph',
        icon: <Pilcrow className='size-3.5' />,
        description: 'Plain text',
        aliases: ['p'],
        action: {
            type: 'paragraph'
        }
    },
    {
        name: 'heading2',
        label: 'Heading 1',
        icon: <Heading1 className='size-3.5' />,
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
        icon: <Heading2 className='size-3.5' />,
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
        icon: <Heading3 className='size-3.5' />,
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
        icon: <List className='size-3.5' />,
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
        icon: <ListOrdered className='size-3.5' />,
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