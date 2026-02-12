import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CalendarEvent } from '@subtrees/types/vendor/calendar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Clock, User, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui';
import { cn } from '@/libs/utils';
import { CheckinButton } from './CheckinMember';

interface AddReservationProps {
  event?: CalendarEvent;
  onRemoveReservation?: (memberId: string) => void;
  lid: string;
  rid: string;
}

export function AddReservation({ event, onRemoveReservation, lid, rid }: AddReservationProps) {
  const [open, setOpen] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={event ? "outline" : "default"}
          size="sm"
          className={cn(
            "h-8 px-3 text-sm font-medium transition-all",
            event ? "border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600" :
              "bg-indigo-600 hover:bg-indigo-700"
          )}
        >
          {event ? (
            <>
              <span className="mr-1">Manage</span>
              <span className="bg-indigo-100 text-indigo-800 text-xs px-1.5 py-0.5 rounded-full ml-1">
                {event.data?.members.length}
              </span>
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              <span>Add</span>
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-lg">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-semibold text-gray-900">
            {event ? `${event.title} Reservations` : 'Create New Reservation'}
          </DialogTitle>
          {event && (
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>
                {format(new Date(event.start), 'EEEE, MMMM d')} •{' '}
                {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
              </span>
            </div>
          )}
        </DialogHeader>

        <div className="px-6 pb-6">
          {event ? (
            <div className="space-y-4">
              <div className="border border-gray-100 rounded-lg bg-gray-50 overflow-hidden">
                <ScrollArea className="h-[280px] w-full">
                  {event.data?.members?.length && event.data.members.length > 0 ? (
                    <ul className="divide-y divide-gray-100">
                      {event.data.members.map((member) => (
                        <li
                          key={member.memberId}
                          className="flex items-center justify-between p-3 hover:bg-white transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={member.avatar || undefined} />
                              <AvatarFallback className="bg-white border border-gray-200 text-gray-700">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {member.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                Member #{member.memberId}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckinButton
                              memberId={String(member.memberId)}
                              event={event}
                              lid={lid}
                              rid={String(rid)}
                            />
                            <button
                              className="px-2 py-1 rounded text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                              onClick={() =>
                                onRemoveReservation &&
                                member?.memberId !== undefined &&
                                onRemoveReservation(String(member.memberId))
                              }
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                      <User className="h-10 w-10 text-gray-300 mb-3" />
                      <h4 className="text-sm font-medium text-gray-500 mb-1">
                        No reservations yet
                      </h4>
                      <p className="text-xs text-gray-400">
                        Add members to this time slot
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </div>
              <Button
                variant="outline"
                className="w-full border-indigo-300 text-indigo-600 hover:bg-indigo-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
                <Plus className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                <h4 className="text-sm font-medium text-gray-500">
                  Create New Reservation
                </h4>
                <p className="text-xs text-gray-400 mt-1">
                  Select a time slot and add members
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}