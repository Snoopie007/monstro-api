"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogSlide,
  DialogBody,
  MultiDialogContent,
} from "@/components/ui/dialog";
import { CalendarEvent as OldCalendarEvent } from "@/types";
import { EnhancedEventDialogProps, Member, MemberWithValidation } from "@/components/event-calendar/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/forms/input";
import {
  Clock,
  Users,
  Calendar as CalendarIcon,
  Plus,
  UserPlus,
  Search,
  Loader2,
  X,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { CheckinButton } from "./CheckinMember";
import { cn, tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/ToolTip";

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function EnhancedEventDialog({
  event,
  isOpen,
  onClose,
  onSave,
  onDelete,
  lid,
  onRemoveReservation,
  onRefreshEvents,
  onMemberUpdate,
}: EnhancedEventDialogProps) {
  // Add member dialog state
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MemberWithValidation[]>(
    []
  );
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);

  // New state for tracking member list updates
  const [memberListVersion, setMemberListVersion] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  // Add local state for members from original data
  const [localMembers, setLocalMembers] = useState(
    event?.__originalData?.members || []
  );

  // Sync local members when prop changes
  useEffect(() => {
    setLocalMembers(event?.__originalData?.members || []);
  }, [event?.__originalData?.members]);

  const canManage = lid && (onRemoveReservation || onRefreshEvents);
  const originalData = event?.__originalData;
  const rid = originalData?.reservationId || originalData?.recurringId || "";
  const sessionId = originalData?.sessionId;

  // Get existing member IDs to filter from search results
  const existingMemberIds = useMemo(
    () => originalData?.members?.map((m) => String(m.memberId)) || [],
    [originalData?.members]
  );

  // Centralized refresh function
  const refreshMemberList = useCallback(() => {
    setMemberListVersion((prev) => prev + 1);
    if (onMemberUpdate) {
      onMemberUpdate();
    }
    if (onRefreshEvents) {
      onRefreshEvents();
    }
  }, [onMemberUpdate, onRefreshEvents]);

  // Enhanced remove member handler
  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      if (!onRemoveReservation || !event || !originalData) return;

      // Create a mock old event for the removal function
      const mockOldEvent: OldCalendarEvent = {
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        duration: 0, // This should be calculated properly
        data: originalData,
        staff: event.staff,
      };

      // Optimistic update
      const previousMembers = [...localMembers];
      setLocalMembers(
        localMembers.filter((m) => String(m.memberId) !== memberId)
      );
      setIsUpdating(true);

      try {
        await onRemoveReservation(mockOldEvent, memberId);
        refreshMemberList();
        toast.success("Member removed successfully");
      } catch (error) {
        setLocalMembers(previousMembers);
        toast.error("Failed to remove member");
        console.error("Remove member error:", error);
      } finally {
        setIsUpdating(false);
      }
    },
    [onRemoveReservation, event, originalData, refreshMemberList, localMembers]
  );

  // Debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        if (!query.trim() || !lid || !sessionId) {
          setSearchResults([]);
          return;
        }

        setSearchLoading(true);
        try {
          const { result, error } = await tryCatch(
            fetch(
              `/api/protected/loc/${lid}/members?query=${encodeURIComponent(
                query
              )}&size=20`
            )
          );

          if (error || !result || !result.ok) {
            toast.error("Failed to search members");
            return;
          }

          const data = await result.json();
          const members = data.members || [];

          // Filter out existing members and validate access
          const filteredMembers = members.filter(
            (member: Member) => !existingMemberIds.includes(member.id)
          );

          // Validate member access for the session
          const validatedMembers = await Promise.all(
            filteredMembers.map(async (member: Member) => {
              const validation = await validateMemberAccess(
                member.id,
                sessionId
              );
              return {
                ...member,
                hasValidAccess: validation.hasAccess,
                accessType: validation.accessType,
                accessDetails: validation.details,
              };
            })
          );

          setSearchResults(validatedMembers);
        } catch (err) {
          console.error("Search error:", err);
          toast.error("Failed to search members");
        } finally {
          setSearchLoading(false);
        }
      }, 300),
    [lid, sessionId, existingMemberIds]
  );

  // Validate member access to session
  const validateMemberAccess = async (memberId: string, sessionId: string) => {
    if (!lid) {
      return {
        hasAccess: false,
        accessType: undefined,
        details: "Location ID not available",
      };
    }

    try {
      const { result, error } = await tryCatch(
        fetch(
          `/api/protected/loc/${lid}/members/${memberId}/session/validate?sessionId=${sessionId}`
        )
      );

      if (error || !result || !result.ok) {
        return {
          hasAccess: false,
          accessType: undefined,
          details: "Unable to validate access",
        };
      }

      const validation = await result.json();
      return {
        hasAccess: validation.hasAccess,
        accessType: validation.accessType,
        details: validation.details,
      };
    } catch (err) {
      console.error("Validation error:", err);
      return {
        hasAccess: false,
        accessType: undefined,
        details: "Validation failed",
      };
    }
  };

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedSearch(value);
  };

  // Toggle member selection
  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  // Add selected members to session
  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    setAddingMembers(true);
    setIsUpdating(true);

    // Optimistic update
    const newMembers = selectedMembers
      .map((id) => {
        const m = searchResults.find((s) => s.id === id);
        if (!m) return null;
        return {
          memberId: m.id,
          name: `${m.firstName} ${m.lastName}`,
          avatar: m.avatar,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    const previousMembers = [...localMembers];
    setLocalMembers([...localMembers, ...newMembers]);

    // Close the add dialog immediately for better UX
    setShowAddMember(false);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedMembers([]);

    try {
      const { result, error } = await tryCatch(
        fetch(`/api/protected/loc/${lid}/reservations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: sessionId,
            startDate: event!.start,
            memberIds: selectedMembers,
          }),
        })
      );

      if (error || !result || !result.ok) {
        const errorData = await result?.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to add members to session");
      }

      toast.success(
        `Successfully added ${selectedMembers.length} member(s) to session`
      );
      refreshMemberList();
    } catch (err) {
      console.error("Add members error:", err);
      toast.error("Failed to add members to session");
      setLocalMembers(previousMembers);
    } finally {
      setAddingMembers(false);
      setIsUpdating(false);
    }
  };

  // Callback for CheckinButton updates
  const handleCheckinUpdate = useCallback(() => {
    refreshMemberList();
  }, [refreshMemberList]);

  // Reset add member dialog when closed
  const handleCloseAddMember = () => {
    setShowAddMember(false);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedMembers([]);
  };

  // Effect to search on mount if query exists
  useEffect(() => {
    if (searchQuery) {
      debouncedSearch(searchQuery);
    }
  }, [searchQuery, debouncedSearch]);

  // Early return after all hooks are called
  if (!event) return null;

  // If this event doesn't have original data, show a simple message
  if (!originalData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <p>
              This is a calendar event. Member management is not available for
              this type of event.
            </p>
            <p>
              <strong>Title:</strong> {event.title}
            </p>
            <p>
              <strong>Description:</strong> {event.description}
            </p>
            <p>
              <strong>Date:</strong>{" "}
              {format(new Date(event.start), "EEEE, MMMM d, yyyy")}
            </p>
            <p>
              <strong>Time:</strong> {format(new Date(event.start), "h:mm a")} -{" "}
              {format(new Date(event.end), "h:mm a")}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <MultiDialogContent>
        <DialogSlide
          show={!showAddMember}
          className="border-gray-200 dark:border-foreground/5 sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {event.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 px-4 pb-4">
            {/* Event Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {format(new Date(event.start), "EEEE, MMMM d, yyyy")} •{" "}
                  {format(new Date(event.start), "h:mm a")} -{" "}
                  {format(new Date(event.end), "h:mm a")}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>
                  {localMembers.length} member
                  {localMembers.length !== 1 ? "s" : ""}
                </span>
              </div>

              {event.staff.id !== '' && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-muted-foreground">
                <User className="h-4 w-4" />
                <span>
                  {event.staff.name}
                </span>
              </div>
              )}

              {originalData.isRecurring && (
                <Badge variant="secondary" className="w-fit">
                  Recurring Reservation
                </Badge>
              )}
            </div>

            {/* Members List */}
            {isUpdating ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Members</h4>
                </div>
                <ScrollArea className="max-h-60">
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={`skeleton-${i}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-muted/50"
                      >
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-[150px]" />
                          <Skeleton className="h-3 w-[100px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowAddMember(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </div>
            ) : localMembers.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Members</h4>
                </div>
                <ScrollArea className="max-h-60">
                  <div className="space-y-2">
                    {localMembers.map((member) => (
                      <div
                        key={`${member.memberId}-${memberListVersion}`}
                        className={`flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-muted/50`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar || undefined} />
                          <AvatarFallback className="text-xs">
                            {member.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-gray-500 dark:text-muted-foreground">
                            {member.memberId}
                          </p>
                        </div>
                        {lid && (
                          <div className="flex items-center gap-1">
                            <CheckinButton
                              memberId={String(member.memberId)}
                              event={{
                                id: event.id,
                                title: event.title,
                                start: event.start,
                                end: event.end,
                                duration: 0,
                                data: originalData,
                                staff: event.staff,
                              }}
                              lid={lid}
                              rid={rid}
                              onUpdate={handleCheckinUpdate}
                            />
                            {new Date(event.start) > new Date() && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    className="text-xs p-1 hover:bg-destructive/40"
                                    onClick={() =>
                                      handleRemoveMember(
                                        String(member.memberId)
                                      )
                                    }
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Remove member</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowAddMember(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Members</h4>
                </div>
                <div className="p-4 text-center bg-gray-50 dark:bg-muted/50 rounded-lg">
                  <Users className="h-8 w-8 mx-auto text-gray-500 dark:text-muted-foreground mb-2" />
                  <p className="text-sm text-gray-600 dark:text-muted-foreground">
                    No members in this reservation
                  </p>
                  {canManage && (
                    <Button
                      size="sm"
                      className="mt-2 dark:bg-foreground/10 dark:hover:bg-foreground/20"
                      onClick={() => setShowAddMember(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer with actions when managing */}
          <DialogFooter className="px-6 py-4 bg-gray-50 dark:bg-muted/20">
            <div className="flex items-center justify-between w-full">
              <p className="text-xs text-gray-500 dark:text-muted-foreground">
                Managing {localMembers.length} member
                {localMembers.length !== 1 ? "s" : ""}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="dark:bg-foreground/10 dark:hover:bg-foreground/20"
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogSlide>

        {/* Add Member Dialog Slide */}
        <DialogSlide
          show={showAddMember}
          className="border-gray-200 dark:border-foreground/5 sm:rounded-lg"
        >
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-sm font-bold">
              Add Members to Session
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
            <div className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search members by name or email..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
                {searchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-500 dark:text-muted-foreground" />
                )}
              </div>

              {/* Search Results */}
              {searchQuery && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 dark:text-muted-foreground">
                    {searchLoading
                      ? "Searching..."
                      : `Found ${searchResults.length} member(s)`}
                  </p>

                  <ScrollArea className="max-h-60">
                    <div className="space-y-2">
                      {searchResults.map((member) => (
                        <div
                          key={member.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                            selectedMembers.includes(member.id)
                              ? "bg-secondary/70 border-primary"
                              : "bg-background border-border hover:bg-secondary/70",
                            !member.hasValidAccess && "opacity-60"
                          )}
                          onClick={() =>
                            member.hasValidAccess &&
                            toggleMemberSelection(member.id)
                          }
                        >
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(member.id)}
                            onChange={() => toggleMemberSelection(member.id)}
                            disabled={!member.hasValidAccess}
                            className="h-4 w-4"
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar || undefined} />
                            <AvatarFallback className="text-xs">
                              {member.firstName.charAt(0)}
                              {member.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-muted-foreground">
                              {member.email}
                            </p>
                            {!member.hasValidAccess && (
                              <p className="text-xs text-red-600">
                                {member.accessDetails ||
                                  "No valid access to this session"}
                              </p>
                            )}
                            {member.hasValidAccess && member.accessType && (
                              <p className="text-xs text-green-600">
                                Access via {member.accessType}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}

                      {searchResults.length === 0 &&
                        !searchLoading &&
                        searchQuery && (
                          <div className="text-center py-4">
                            <Users className="h-8 w-8 mx-auto text-gray-500 dark:text-muted-foreground mb-2" />
                            <p className="text-sm text-gray-600 dark:text-muted-foreground">
                              No members found
                            </p>
                          </div>
                        )}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Selected Members Preview */}
              {selectedMembers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium">
                    Selected Members ({selectedMembers.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map((memberId) => {
                      const member = searchResults.find(
                        (m) => m.id === memberId
                      );
                      if (!member) return null;

                      return (
                        <Badge
                          key={memberId}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {member.firstName} {member.lastName}
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => toggleMemberSelection(memberId)}
                            className="ml-1 hover:text-destructive cursor-pointer px-0.5 py-1"
                          >
                            <X className="size-3" />
                          </Button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="bg-primary/70 hover:bg-primary/80"
              onClick={handleCloseAddMember}
              disabled={addingMembers}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleAddMembers}
              disabled={selectedMembers.length === 0 || addingMembers}
              className={cn(
                "border-gray-300 bg-gray-200 hover:bg-gray-300 dark:border-foreground/10 dark:bg-foreground/10 dark:hover:bg-foreground/20 children:hidden",
                {
                  "children:inline-flex": addingMembers,
                }
              )}
            >
              <Loader2 className="mr-2 h-4 w-4 hidden animate-spin" />
              Add{" "}
              {selectedMembers.length > 0 ? `${selectedMembers.length} ` : ""}
              Member{selectedMembers.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogSlide>
      </MultiDialogContent>
    </Dialog>
  );
}
