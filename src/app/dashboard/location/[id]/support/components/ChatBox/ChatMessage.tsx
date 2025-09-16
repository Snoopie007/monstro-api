
import { Member, SupportMessage } from '@/types'
import { format } from 'date-fns';
import React, { useMemo } from 'react'

interface ChatMessageProps {
    message: SupportMessage;
    member: Member | undefined;
}

export function ChatMessage({ message, member }: ChatMessageProps) {


    const isMember = useMemo(() => {
        return message.role === "human";
    }, [message.role]);

    const isStaff = useMemo(() => {
        return message.role === "staff";
    }, [message.role]);
    const isAI = useMemo(() => {
        return message.role === "ai";
    }, [message.role]);
    const isSystem = useMemo(() => {
        return message.role === "system";
    }, [message.role]);


    const userName = useMemo(() => {
        return isMember ? member?.firstName + " " + member?.lastName : message.agentName
    }, [message]);

    return (
        <div key={message.id} className="flex gap-3">
            <div className="flex-shrink-0">

            </div>
            <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">

                    <span className="text-xs text-muted-foreground">
                        {format(message.created || new Date(), "HH:mm")}
                    </span>
                </div>
                <div className="text-sm leading-relaxed">
                    {message.content}
                </div>
            </div>
        </div>
    )
}