"use client";

import React, { useState, useRef, KeyboardEvent } from "react";
import { useChatContext } from "./AIChatProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";

export function ChatInput() {
  const [input, setInput] = useState("");
  const { sendMessage, isLoading, selectedBot } = useChatContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading || !selectedBot) {
      return;
    }

    const message = input.trim();
    setInput("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    await sendMessage(message);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  };

  const isDisabled = !selectedBot || isLoading;

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={
            !selectedBot
              ? "Select a bot to start chatting..."
              : isLoading
              ? "Bot is responding..."
              : "Type your message... (Enter to send, Shift+Enter for new line)"
          }
          disabled={isDisabled}
          className="min-h-[40px] max-h-[120px] resize-none"
          rows={1}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isDisabled || !input.trim()}
        size="sm"
        className="px-3 h-[40px] shrink-0"
      >
        {isLoading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Send size={16} />
        )}
      </Button>
    </div>
  );
}
