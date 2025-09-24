
import { Member, SupportAssistant, SupportMessage } from '@/types'
import { format } from 'date-fns';
import React, { useMemo } from 'react'
import { useSupport } from '../../providers/SupportProvider';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
    message: SupportMessage;
    member: Member | undefined;
}

export function ChatMessage({ message, member }: ChatMessageProps) {
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
        <div key={message.id} className="flex gap-3">
            <div className="flex-shrink-0">
                <div className='size-10 rounded-full bg-foreground/10 border-foreground/10'>

                </div>
            </div>
            <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm  text-indigo-500 font-bold">
                        {userName}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        {format(message.created || new Date(), "HH:mm a")}
                    </span>
                </div>
                <div className="leading-relaxed">
                <ReactMarkdown>
                    {message.content}
                </ReactMarkdown>
                </div>
            </div>
        </div>
    )
}