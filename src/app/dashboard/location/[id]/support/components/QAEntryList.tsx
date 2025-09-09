"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { 
  MessageSquare, 
  Edit, 
  Trash2, 
  MoreVertical,
  ChevronDown,
  ChevronUp 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QAEntryUI } from "@/types/knowledgeBase";

interface QAEntryListProps {
  entries: QAEntryUI[];
  onEdit: (entry: QAEntryUI) => void;
  onDelete: (entryId: string) => void;
  isLoading?: boolean;
}

export function QAEntryList({
  entries,
  onEdit,
  onDelete,
  isLoading = false,
}: QAEntryListProps) {
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  const truncateText = (text: string, limit: number = 100) => {
    if (text.length <= limit) return text;
    return text.substring(0, limit) + "...";
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MessageSquare size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Q&A entries yet</h3>
          <p className="text-muted-foreground mb-4">
            Start building your knowledge base by adding questions and answers that your support bot can use to help customers.
          </p>
          <Badge variant="outline" className="text-xs">
            Click "Add Q&A Entry" above to get started
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3">
        {entries.map((entry) => {
          const isExpanded = expandedEntries.has(entry.id);
          
          return (
            <Card key={entry.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Question */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          Question
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(entry.id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </Button>
                      </div>
                      <p className="text-sm font-medium leading-relaxed">
                        {isExpanded ? entry.question : truncateText(entry.question, 120)}
                      </p>
                    </div>

                    {/* Answer */}
                    <div className="mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Answer
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {isExpanded ? entry.answer : truncateText(entry.answer, 150)}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-muted-foreground">
                        Added {entry.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(entry)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      title="Edit entry"
                    >
                      <Edit size={14} />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <MoreVertical size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onEdit(entry)}
                          className="gap-2"
                        >
                          <Edit size={14} />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(entry.id)}
                          className="gap-2 text-red-600 focus:text-red-600"
                        >
                          <Trash2 size={14} />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
