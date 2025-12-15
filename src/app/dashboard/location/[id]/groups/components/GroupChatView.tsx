'use client'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Avatar, AvatarFallback, AvatarImage, ScrollArea } from "@/components/ui";
import { useGroupChat } from "@/hooks/useGroupChat";
import { useSession } from "@/hooks/useSession";
import { formatMessageTimestamp, getDateLabel } from "@/libs/utils";
import { Message } from "@/types/chats";
import { isSameDay } from "date-fns";
import { useCallback, useRef, useState } from "react";
import { toast } from "react-toastify";
import { ChatActions } from "./ChatActions";
import { EditableMessage } from "./EditableMessage";
import { GroupChatInput } from "./GroupChatInput";
import { useGroups } from "./GroupsProvider";
import { MessageActionsDropdown } from "./MessageActionsDropdown";
import { ChatReactions, ChatReactionSheet } from "./reactions";
import { MessageMedia } from "./MessageMedia";
import { UploadingMessage } from "./UploadingMessage";

export function GroupChatView({ lid }: { lid: string }) {
    const {currentChat} = useGroups()
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { data: session } = useSession();
    const { messages, sendMessage, editMessage, deleteMessage, toggleReaction, isLoading } = useGroupChat({
        chatId: currentChat?.id ?? null,
        fromUserId: session?.user?.id ?? null,
    });
    
    // State for reaction picker
    const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
    const [selectedMessageForReaction, setSelectedMessageForReaction] = useState<Message | null>(null);
    
    // State for editing
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    
    // State for delete confirmation
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);

    const handleSendMessage = async (content: string, files: File[]) => {
        await sendMessage(content, files);
    };
    
    const handleOpenReactionPicker = useCallback((message: Message) => {
        setSelectedMessageForReaction(message);
        setReactionPickerOpen(true);
    }, []);
    
    const handleToggleReaction = useCallback(async (
        messageId: string,
        emoji: { value: string; name: string; type: string }
    ) => {
        try {
            await toggleReaction(messageId, emoji);
        } catch (err) {
            console.error('Failed to toggle reaction:', err);
        }
    }, [toggleReaction]);
    
    const handleReactionSelect = useCallback((emoji: { value: string; name: string; type: string }) => {
        if (selectedMessageForReaction && session?.user?.id) {
            handleToggleReaction(selectedMessageForReaction.id, emoji);
        }
        setReactionPickerOpen(false);
        setSelectedMessageForReaction(null);
    }, [selectedMessageForReaction, session?.user?.id, handleToggleReaction]);
    
    const handleStartEdit = useCallback((messageId: string) => {
        setEditingMessageId(messageId);
    }, []);
    
    const handleSaveEdit = useCallback(async (messageId: string, content: string) => {
        try {
            await editMessage(messageId, content);
            setEditingMessageId(null);
        } catch (err) {
            console.error('Failed to edit message:', err);
            toast.error('Failed to edit message');
        }
    }, [editMessage]);
    
    const handleCancelEdit = useCallback(() => {
        setEditingMessageId(null);
    }, []);
    
    const handleRequestDelete = useCallback((message: Message) => {
        setMessageToDelete(message);
        setDeleteConfirmOpen(true);
    }, []);
    
    const handleConfirmDelete = useCallback(async () => {
        if (messageToDelete) {
            try {
                await deleteMessage(messageToDelete.id);
                setDeleteConfirmOpen(false);
                setMessageToDelete(null);
            } catch (err) {
                toast.error('Failed to delete message');
                console.error('Failed to delete message:', err);
            }
        }
    }, [messageToDelete, deleteMessage]);

    if (!currentChat){
        return (
            <div className="h-full flex items-center justify-center text-center px-4">
                <div className="space-y-2">
                    <span className="text-sm text-muted-foreground block">
                        This group has no messages yet.
                    </span>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-muted/50 rounded-lg flex-1 h-full flex flex-col min-h-0 overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-foreground/5 p-4 flex-shrink-0">
            <div className="flex flex-row items-center justify-between">
              <div className="flex flex-row items-center gap-2">
                <span className="text-sm font-bold">{currentChat?.name ?? currentChat?.group?.name}</span>
              </div>
              <ChatActions 
                lid={lid} 
                chatId={currentChat.id} 
                chatMembers={currentChat.chatMembers}
              />
            </div>
    
          </div>
    
          <div className="flex-1 relative min-h-0">
            <div className="absolute inset-0 flex flex-col">
                {currentChat?.chatMembers?.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center px-4">
                    <div className="space-y-2">
                    <span className="text-sm text-muted-foreground block">
                        This group has no members yet.
                    </span>
                    </div>
                </div>  
                ) : (
                <>
                    <ScrollArea className="flex-1 w-full px-4">
                        <div className="space-y-6 py-4">
                        {messages?.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-8">
                            No messages yet. Start the conversation!
                            </div>
                        ) : (
                            messages.map((message, index) => {
                                const isFromCurrentUser = message.senderId === session?.user?.id;
                                const displayName = message.sender?.name ?? "Unknown";
                                const avatarSrc = message.sender?.image ?? undefined;
                                const fallbackInitials = displayName.charAt(0) ?? "?";
                                
                                const prevMessage = messages[index - 1];
                                const isNewDay = !prevMessage || !isSameDay(new Date(prevMessage.created), new Date(message.created));
                                return (
                                    <div key={message.id}>
                                        {isNewDay && message.created && (
                                            <div className="relative flex items-center justify-center my-6">
                                                <div className="absolute inset-0 flex items-center">
                                                    <span className="w-full border-t border-muted-foreground/20" />
                                                </div>
                                                <span className="relative bg-muted px-2 text-xs text-muted-foreground rounded-full">
                                                    {getDateLabel(new Date(message.created))}
                                                </span>
                                            </div>
                                        )}
                                        <div
                                            className={`flex gap-3 flex-row group hover:bg-muted/30 rounded-lg px-4 py-2 -mx-2 transition-colors`}
                                        >
                                            <Avatar className="h-8 w-8 flex-shrink-0">
                                                <AvatarImage src={avatarSrc} />
                                                <AvatarFallback className="text-xs">
                                                {fallbackInitials || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div
                                                className={`flex flex-col gap-1 max-w-[70%] items-start`}
                                            >
                                                <div className="flex flex-row items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">
                                                        {isFromCurrentUser ? "You" : displayName}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground/60">
                                                        {message.created ? formatMessageTimestamp(message.created) : "Unknown time"}
                                                    </span>
                                                    {message.updated && (
                                                        <span className="text-xs text-muted-foreground/40 italic">
                                                            (edited)
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Message content - check if optimistic upload in progress */}
                                                {message.isOptimistic && message.pendingFiles ? (
                                                    <>
                                                        {/* Show text content if any */}
                                                        {message.content && (
                                                            <div className="text-sm whitespace-pre-wrap break-words">
                                                                {message.content}
                                                            </div>
                                                        )}
                                                        {/* Show upload progress */}
                                                        <UploadingMessage 
                                                            progress={message.progress ?? 0} 
                                                            files={message.pendingFiles} 
                                                        />
                                                    </>
                                                ) : (
                                                    <>
                                                        {/* Normal message rendering */}
                                                        <EditableMessage
                                                            message={message}
                                                            isEditing={editingMessageId === message.id}
                                                            onStartEdit={() => handleStartEdit(message.id)}
                                                            onSave={(content) => handleSaveEdit(message.id, content)}
                                                            onCancel={handleCancelEdit}
                                                        />
                                                        
                                                        {/* Media attachments */}
                                                        <MessageMedia media={message.media || []} />
                                                        
                                                        {/* Reactions */}
                                                        <ChatReactions
                                                            reactions={message.reactions}
                                                            currentUserId={session?.user?.id}
                                                            onToggleReaction={(emoji) => handleToggleReaction(message.id, emoji)}
                                                            onOpenPicker={() => handleOpenReactionPicker(message)}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                            {/* Actions dropdown - far right */}
                                            {isFromCurrentUser && !message.isOptimistic && (
                                                <div className="ml-auto flex-shrink-0 self-start pt-0.5">
                                                    <MessageActionsDropdown
                                                        message={message}
                                                        onEdit={() => handleStartEdit(message.id)}
                                                        onDelete={() => handleRequestDelete(message)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>
                    <div className="flex-shrink-0 p-4">
                        <GroupChatInput onSend={handleSendMessage} disabled={isLoading} />
                    </div>
                </>
                )}
            </div>
          </div>
          
          {/* Reaction Picker Sheet */}
          <ChatReactionSheet
            open={reactionPickerOpen}
            onOpenChange={(open) => {
              setReactionPickerOpen(open);
              if (!open) setSelectedMessageForReaction(null);
            }}
            onSelect={handleReactionSelect}
          />
          
          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Message</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this message? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setMessageToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
}