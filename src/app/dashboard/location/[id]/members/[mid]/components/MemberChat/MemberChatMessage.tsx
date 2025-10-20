import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'

export function MemberChatMessage({
    message,
    userName,
}: {
    message: {
        id: string
        role: string
        content: string
        created: Date
    }
    userName: string
}) {
    return (
        <div key={message.id} className="flex gap-3">
            <div className="flex-shrink-0">
                <div className="size-10 rounded-full bg-foreground/10 border-foreground/10"></div>
            </div>
            <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm  text-indigo-500 font-bold">
                        {userName}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        {format(message.created || new Date(), 'HH:mm a')}
                    </span>
                </div>
                <div className="leading-relaxed">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
            </div>
        </div>
    )
}
