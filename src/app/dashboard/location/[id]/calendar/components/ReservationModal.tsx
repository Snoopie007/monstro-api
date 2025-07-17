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
import { CalendarEvent } from "@/types";
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
} from "lucide-react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { CheckinButton } from "./CheckinMember";
import { cn, tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";

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

// Types for member data
interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  memberLocation: {
    status: string;
  };
}

interface MemberWithValidation extends Member {
  hasValidAccess: boolean;
  accessType?: "subscription" | "package";
  accessDetails?: string;
}

interface ReservationModalProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lid?: string;
  onRemoveReservation?: (
    event: CalendarEvent,
    memberId: string
  ) => Promise<void>;
  onRefreshEvents?: () => void;
  onMemberUpdate?: () => void; // New prop for member-specific updates
}

export function ReservationModal({
  event,
  open,
  onOpenChange,
  lid,
  onRemoveReservation,
  onRefreshEvents,
  onMemberUpdate,
}: ReservationModalProps) {
  const [isManaging, setIsManaging] = useState(false);

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

  const canManage = lid && (onRemoveReservation || onRefreshEvents);
  const rid = event?.data.reservationId || event?.data.recurringId || "";
  const sessionId = event?.data.sessionId;

  // Debug logging
  console.log("ReservationModal Debug:", {
    lid,
    hasOnRemoveReservation: !!onRemoveReservation,
    hasOnRefreshEvents: !!onRefreshEvents,
    canManage,
    isManaging,
    membersLength: event?.data.members.length || 0,
  });

  // Get existing member IDs to filter from search results
  const existingMemberIds = useMemo(
    () => event?.data.members?.map((m) => String(m.memberId)) || [],
    [event?.data.members]
  );

  // Centralized refresh function
  const refreshMemberList = useCallback(() => {
    // Increment version to trigger re-renders if needed
    setMemberListVersion((prev) => prev + 1);

    // Call all available refresh callbacks
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
      if (!onRemoveReservation || !event) return;

      try {
        // Call the removal function
        await onRemoveReservation(event, memberId);

        // Refresh the member list on success
        refreshMemberList();

        toast.success("Member removed successfully");
      } catch (error) {
        toast.error("Failed to remove member");
        console.error("Remove member error:", error);
      }
    },
    [onRemoveReservation, event, refreshMemberList]
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
      // Check if member has valid subscription or package for this session
      const { result, error } = await tryCatch(
        fetch(
          `/api/protected/loc/${lid}/members/${memberId}/validate-session?sessionId=${sessionId}`
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
        toast.error(errorData.error || "Failed to add members to session");
        return;
      }

      toast.success(
        `Successfully added ${selectedMembers.length} member(s) to session`
      );

      // Reset state
      setShowAddMember(false);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedMembers([]);

      // Use centralized refresh function
      refreshMemberList();
    } catch (err) {
      console.error("Add members error:", err);
      toast.error("Failed to add members to session");
    } finally {
      setAddingMembers(false);
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

  // Type assertion to help TypeScript understand event is not null
  const safeEvent = event as NonNullable<typeof event>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <MultiDialogContent>
        <DialogSlide
          show={!showAddMember}
          className="border-foreground/5 sm:max-w-md"
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {format(new Date(event.start), "EEEE, MMMM d, yyyy")} •{" "}
                  {format(new Date(event.start), "h:mm a")} -{" "}
                  {format(new Date(event.end), "h:mm a")}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>
                  {event.data.members.length} member
                  {event.data.members.length !== 1 ? "s" : ""}
                </span>
              </div>

              {event.data.isRecurring && (
                <Badge variant="secondary" className="w-fit">
                  Recurring Reservation
                </Badge>
              )}
            </div>

            {/* Members List */}
            {event.data.members.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Members</h4>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsManaging(!isManaging)}
                      className="text-xs"
                    >
                      {isManaging ? "View Only" : "Manage"}
                    </Button>
                  )}
                </div>
                <ScrollArea className="max-h-60">
                  <div className="space-y-2">
                    {event.data.members.map((member) => (
                      <div
                        key={`${member.memberId}-${memberListVersion}`}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          isManaging ? "bg-muted/50" : "bg-muted/50"
                        }`}
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
                          <p className="text-xs text-muted-foreground">
                            {member.memberId}
                          </p>
                        </div>
                        {isManaging && lid && (
                          <div className="flex items-center gap-2">
                            <CheckinButton
                              memberId={String(member.memberId)}
                              event={event}
                              lid={lid}
                              rid={rid}
                              onUpdate={handleCheckinUpdate}
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              className="text-xs h-6 px-2"
                              onClick={() =>
                                handleRemoveMember(String(member.memberId))
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {isManaging && (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => setShowAddMember(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Members</h4>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsManaging(!isManaging)}
                      className="text-xs"
                    >
                      {isManaging ? "View Only" : "Manage"}
                    </Button>
                  )}
                </div>
                <div className="p-4 text-center bg-muted/50 rounded-lg">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No members in this reservation
                  </p>
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
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
          {isManaging && (
            <DialogFooter className="px-6 py-4 bg-muted/20">
              <div className="flex items-center justify-between w-full">
                <p className="text-xs text-muted-foreground">
                  Managing {event.data.members.length} member
                  {event.data.members.length !== 1 ? "s" : ""}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsManaging(false)}
                  >
                    Done
                  </Button>
                  {(onRefreshEvents || onMemberUpdate) && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        refreshMemberList();
                        setIsManaging(false);
                      }}
                    >
                      Refresh
                    </Button>
                  )}
                </div>
              </div>
            </DialogFooter>
          )}
        </DialogSlide>

        {/* Add Member Dialog Slide */}
        <DialogSlide
          show={showAddMember}
          className="border-foreground/5 sm:rounded-lg"
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search members by name or email..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
                {searchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search Results */}
              {searchQuery && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
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
                            <p className="text-xs text-muted-foreground">
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
                            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
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
              variant="outline"
              size="sm"
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
              className={cn("children:hidden", {
                "children:inline-flex": addingMembers,
              })}
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
