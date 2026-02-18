
import { Member, SupportAssistant, SupportMessage } from '@subtrees/types'
import { format } from 'date-fns';
import React, { useMemo } from 'react'
import { useSupport } from '../../providers/SupportProvider';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
    message: SupportMessage;
    member: Member | undefined;
    isGrouped?: boolean;
}

export function ChatMessage({ message, member, isGrouped = false }: ChatMessageProps) {
    const { assistant } = useSupport()

    const { isMember, isStaff, isAI, isSystem } = useMemo(() => ({
        isMember: message.role === "human",
        isStaff: message.agentId,
        isAI: message.role === "ai",
        isSystem: message.role === "system"
    }), [message.role]);

    const userName = useMemo(() => {
        if (isStaff && !isSystem) {
            return message.agentName
        } else if (isSystem) {
            return "System Message"
        }
        if (isAI) {
            return "Support Assistant"
        }
        return member?.firstName
    }, [message]);

    return (
        <div key={message.id} className={`flex gap-3 ${isGrouped ? '' : 'py-1'}`}>
            {!isGrouped ? (
                <div className="flex-shrink-0">
                    <div className='size-8 rounded-full bg-foreground/10 border-foreground/10' />
                </div>
            ) : (
                <div className="w-8 flex-shrink-0" />
            )}
            <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                {!isGrouped && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-indigo-500 font-bold">
                            {userName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {format(message.created || new Date(), "HH:mm a")}
                        </span>
                    </div>
                )}
                <div className="leading-relaxed text-sm">
                    <ReactMarkdown>
                        {message.content}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    )
}