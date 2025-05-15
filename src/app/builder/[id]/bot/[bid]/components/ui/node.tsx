import * as React from "react"

import { Handle, Node, NodeProps, Position } from "@xyflow/react"
import { NodeDataType } from "@/types"
import { cn } from "@/libs/utils"
import { useMemo } from "react"


export interface NodeWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
    currentNode: NodeProps<Node<NodeDataType>>,
    isValid: boolean
}

const NodeWrapper = React.forwardRef<HTMLDivElement, NodeWrapperProps>(
    ({ className, currentNode, children, isValid, ...props }, ref) => {

        const isGroup = useMemo(() => currentNode.data.groupParentId ? true : false, [currentNode.data.groupParentId])
        return (
            <div ref={ref}
                className={cn('w-[200px] h-[40px] border border-gray-800 flex flex-row items-center rounded-sm py-1.5 px-2 bg-white dark:bg-black relative',
                    'dark:border-gray-700',
                    {
                        'dark:border-red-500 border-red-500 dark:text-white': !isValid,
                        'border-yellow-500 bg-yellow-400  dark:bg-yellow-500 dark:border-yellow-500 dark:text-black ': isGroup && isValid
                    }
                )}
                {...props}
            >

                <Handle type="target" position={Position.Top} />
                {children}
                <Handle type="source" position={Position.Bottom} id={currentNode.id} />
            </div>
        )
    }
)
NodeWrapper.displayName = "NodeWrapper"

const NodeTrigger = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => {
        return (
            <div className='absolute noclick  flex right-1 top-2 nodrag nopan '  {...props}>
                {children}
            </div>
        )
    }
)

NodeTrigger.displayName = "NodeTrigger"

const NodeContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => {
        return (
            <div className='w-full text-clip text-sm' {...props}>
                {children}
            </div>
        )
    }
)

NodeContent.displayName = "NodeContent"

const NodeTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => {
        return (
            <div className='flex flex-row items-center gap-1' {...props}>
                {children}
            </div>
        )
    }
)

NodeTitle.displayName = "NodeTitle"

// const NodeDecriptions = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
//     ({ children, ...props }, ref) => {
//         return (
//             <p ref={ref} className='text-[10px]  leading-3 text-gray-400' {...props}>{children}</p>
//         )
//     }
// )
// NodeDecriptions.displayName = "NodeDecriptions"
export {
    NodeWrapper,
    NodeTrigger,
    NodeContent,
    NodeTitle,
    // NodeDecriptions
}
