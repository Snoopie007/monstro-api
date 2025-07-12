import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CalendarEvent } from "@/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Users,
  Calendar as CalendarIcon,
  Plus,
  UserPlus,
} from "lucide-react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { CheckinButton } from "./CheckinMember";

interface ReservationModalProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lid?: string;
  onRemoveReservation?: (event: CalendarEvent, memberId: string) => void;
  onRefreshEvents?: () => void;
}

export function ReservationModal({
  event,
  open,
  onOpenChange,
  lid,
  onRemoveReservation,
  onRefreshEvents,
}: ReservationModalProps) {
  const [isManaging, setIsManaging] = useState(false);

  if (!event) return null;

  const canManage = lid && (onRemoveReservation || onRefreshEvents);
  const rid = event.data.reservationId || event.data.recurringId || "";

  // Debug logging
  console.log("ReservationModal Debug:", {
    lid,
    hasOnRemoveReservation: !!onRemoveReservation,
    hasOnRefreshEvents: !!onRefreshEvents,
    canManage,
    isManaging,
    membersLength: event.data.members.length,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
                      key={member.memberId}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        isManaging
                          ? "bg-muted/50 border border-border/50"
                          : "bg-muted/50"
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
                          Member #{member.memberId}
                        </p>
                      </div>
                      {isManaging && lid && (
                        <div className="flex items-center gap-2">
                          <CheckinButton
                            memberId={String(member.memberId)}
                            event={event}
                            lid={lid}
                            rid={rid}
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="text-xs h-6 px-2"
                            onClick={() =>
                              onRemoveReservation &&
                              onRemoveReservation(
                                event,
                                String(member.memberId)
                              )
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
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    // TODO: Implement add member functionality
                    console.log("Add member clicked");
                  }}
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
                    onClick={() => {
                      // TODO: Implement add member functionality
                      console.log("Add member clicked");
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Additional Info - Only show when not managing */}
          {!isManaging && (
            <div className="pt-4 border-t">
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Session ID: {event.data.sessionId}</p>
                <p>Program ID: {event.data.programId}</p>
                {event.data.reservationId && (
                  <p>Reservation ID: {event.data.reservationId}</p>
                )}
                {event.data.recurringId && (
                  <p>Recurring ID: {event.data.recurringId}</p>
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
                {onRefreshEvents && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      onRefreshEvents();
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
      </DialogContent>
    </Dialog>
  );
}
