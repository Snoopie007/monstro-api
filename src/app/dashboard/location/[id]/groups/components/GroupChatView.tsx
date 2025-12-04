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
                                                <EditableMessage
                                                    message={message}
                                                    isEditing={editingMessageId === message.id}
                                                    onStartEdit={() => handleStartEdit(message.id)}
                                                    onSave={(content) => handleSaveEdit(message.id, content)}
                                                    onCancel={handleCancelEdit}
                                                />
                                                
                                                {/* Separate images from other files */}
                                                {(() => {
                                                    const mediaFiles = message.media || [];
                                                    const images = mediaFiles.filter(m => m.fileType === 'image' || m.mimeType?.startsWith('image/'));
                                                    const otherFiles = mediaFiles.filter(m => !(m.fileType === 'image' || m.mimeType?.startsWith('image/')));

                                                    return (
                                                        <>
                                                            {/* Render Non-Image Files List */}
                                                            {otherFiles.length > 0 && (
                                                                <div className="flex flex-wrap gap-2 mt-2">
                                                                    {otherFiles.map((file) => (
                                                                         <a 
                                                                            key={file.id}
                                                                            href={file.url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center p-3 bg-muted/50 gap-2 min-w-[150px] hover:bg-muted transition-colors rounded-md border border-border/50"
                                                                        >
                                                                            <span className="text-xs truncate max-w-[120px]">{file.fileName}</span>
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Render Images Grid */}
                                                            {images.length > 0 && (
                                                                <div className={`grid gap-0.5 mt-2 rounded-xl overflow-hidden border border-border/20 ${
                                                                    images.length === 1 ? 'grid-cols-1 max-w-[260px]' : 'grid-cols-2 max-w-[320px]'
                                                                }`}>
                                                                    {images.slice(0, 4).map((image, index) => {
                                                                        const isLastSlot = index === 3;
                                                                        const hasMore = images.length > 4;
                                                                        // If we have >4 images, the 4th slot (index 3) shows the overlay
                                                                        // The count represents the 4th image + all remaining hidden images
                                                                        const showOverlay = isLastSlot && hasMore;
                                                                        const extraCount = images.length - 3;
                                                                        
                                                                        // For exactly 3 images, the first image should span full height (row-span-2)
                                                                        const isFirstOfThree = images.length === 3 && index === 0;

                                                                        return (
                                                                            <div 
                                                                                key={image.id} 
                                                                                className={`relative bg-muted ${
                                                                                    images.length === 1 
                                                                                        ? 'aspect-auto' 
                                                                                        : (isFirstOfThree ? 'row-span-2 h-full' : 'aspect-square')
                                                                                }`}
                                                                            >
                                                                                <img 
                                                                                    src={image.url} 
                                                                                    alt={image.fileName || 'Attachment'}
                                                                                    className="w-full h-full object-cover hover:opacity-90 transition-opacity cursor-pointer"
                                                                                    onClick={() => window.open(image.url, '_blank')}
                                                                                />
                                                                                {showOverlay && (
                                                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                                                                                        <span className="text-white font-bold text-lg">+{extraCount}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                                
                                                {/* Reactions */}
                                                <ChatReactions
                                                    reactions={message.reactions}
                                                    currentUserId={session?.user?.id}
                                                    onToggleReaction={(emoji) => handleToggleReaction(message.id, emoji)}
                                                    onOpenPicker={() => handleOpenReactionPicker(message)}
                                                />
                                            </div>
                                            {/* Actions dropdown - far right */}
                                            {isFromCurrentUser && (
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