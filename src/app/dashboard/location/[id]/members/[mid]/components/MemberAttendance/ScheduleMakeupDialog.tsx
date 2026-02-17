"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { format, addMinutes, addDays, isSameDay } from "date-fns";
import { CalendarIcon, CalendarX, Clock, Loader2 } from "lucide-react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Badge,
  Separator,
} from "@/components/ui";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormLabel,
  FormMessage,
  Input,
} from "@/components/forms";
import { cn, tryCatch } from "@/libs/utils";
import { MakeupClassSchema, type MakeupClassFormData } from "./schemas";
import type { Reservation } from "@/types/reservation";
import type { MissedReservation } from "@subtrees/types/attendance";
import { RadioBox } from "@/components/forms/radio-box";

interface AvailableSlot {
  sessionId: string;
  time: string;
  programName: string;
  availableSpots: number;
  duration: number;
}

interface MakeUpCreditsInfo {
  used: number;
  limit: number;
  remaining: number;
}

interface BlockedDate {
  date: string;
  reason: string;
}

interface ScheduleMakeupDialogProps {
  locationId: string;
  memberId: string;
  originalReservation: MissedReservation & {
    memberSubscriptionId?: string | null;
    memberPackageId?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ScheduleMakeupDialog({
  locationId,
  memberId,
  originalReservation,
  open,
  onOpenChange,
  onSuccess,
}: ScheduleMakeupDialogProps) {
  const [saving, setSaving] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [creditsInfo, setCreditsInfo] = useState<MakeUpCreditsInfo | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loadingBlockedDates, setLoadingBlockedDates] = useState(false);
  const [customTime, setCustomTime] = useState("12:00");
  const [customDuration, setCustomDuration] = useState(30);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const form = useForm<MakeupClassFormData>({
    resolver: zodResolver(MakeupClassSchema),
    defaultValues: {
      originalReservationId: originalReservation.id,
      startOn: new Date(),
      endOn: addMinutes(new Date(), 30),
      sessionId: undefined,
      useCustomTime: false,
      customDuration: 30,
    },
  });

  const useCustomTime = form.watch('useCustomTime');
  const sessionId = form.watch('sessionId');

  const blockedDateSet = useMemo(() => {
    const set = new Set<string>();
    for (const b of blockedDates) {
      set.add(b.date.slice(0, 10));
    }
    return set;
  }, [blockedDates]);

  const isDateBlocked = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return blockedDateSet.has(dateStr);
  };

  const getBlockedReason = (date: Date): string | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const blocked = blockedDates.find(b => b.date.slice(0, 10) === dateStr);
    return blocked?.reason || null;
  };

  const selectedDateBlocked = selectedCalendarDate ? isDateBlocked(selectedCalendarDate) : false;
  const selectedDateBlockedReason = selectedCalendarDate ? getBlockedReason(selectedCalendarDate) : null;

  useEffect(() => {
    if (!open) return;

    async function fetchCreditsInfo() {
      setLoadingCredits(true);
      try {
        const subId = originalReservation.memberSubscriptionId;
        const pkgId = originalReservation.memberPackageId;
        
        if (subId) {
          const res = await fetch(`/api/protected/loc/${locationId}/members/${memberId}/subs/${subId}/credits`);
          if (res.ok) {
            const data = await res.json();
            setCreditsInfo(data);
          }
        } else if (pkgId) {
          const res = await fetch(`/api/protected/loc/${locationId}/members/${memberId}/pkgs/${pkgId}/credits`);
          if (res.ok) {
            const data = await res.json();
            setCreditsInfo(data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch credits info:', error);
      }
      setLoadingCredits(false);
    }

    fetchCreditsInfo();
  }, [open, locationId, memberId, originalReservation.memberSubscriptionId, originalReservation.memberPackageId]);

  useEffect(() => {
    if (!open) return;

    async function fetchBlockedDates() {
      setLoadingBlockedDates(true);
      try {
        const startDate = new Date();
        const endDate = addDays(new Date(), 90);
        
        const res = await fetch(
          `/api/protected/loc/${locationId}/closures/calendar?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        );
        if (res.ok) {
          const data = await res.json();
          setBlockedDates(data);
        }
      } catch (error) {
        console.error('Failed to fetch blocked dates:', error);
      }
      setLoadingBlockedDates(false);
    }

    fetchBlockedDates();
  }, [open, locationId]);

  // Fetch available slots when calendar date changes
  useEffect(() => {
    if (!selectedCalendarDate || !open) return;

    async function fetchSlots() {
      setLoadingSlots(true);
      try {
        const dateStr = format(selectedCalendarDate, 'yyyy-MM-dd');
        const res = await fetch(
          `/api/protected/loc/${locationId}/sessions/available?date=${dateStr}&programId=${originalReservation.programId || ''}`
        );
        if (res.ok) {
          const data = await res.json();
          setAvailableSlots(data.slots || []);
        }
      } catch (error) {
        console.error('Failed to fetch available slots:', error);
      }
      setLoadingSlots(false);
    }

    fetchSlots();
  }, [selectedCalendarDate, locationId, originalReservation.programId, open]);

  async function onSubmit(data: MakeupClassFormData) {
    setSaving(true);

    const { result, error } = await tryCatch(
      fetch(`/api/protected/loc/${locationId}/reservations/makeup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          originalReservationId: data.originalReservationId,
          startOn: data.startOn.toISOString(),
          endOn: data.endOn.toISOString(),
          sessionId: data.useCustomTime ? null : data.sessionId,
        }),
      })
    );

    setSaving(false);

    if (error || !result?.ok) {
      toast.error('Failed to schedule make-up class');
      return;
    }

    toast.success('Make-up class scheduled successfully');
    form.reset();
    onSuccess?.();
    onOpenChange(false);
  }

  function handleClose() {
    form.reset();
    setSelectedCalendarDate(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today;
    });
    onOpenChange(false);
  }

  function handleCustomTimeToggle(useCustom: boolean) {
    form.setValue('useCustomTime', useCustom);
    if (useCustom) {
      form.setValue('sessionId', undefined);
      const startDate = new Date(selectedCalendarDate);
      const [hours, minutes] = customTime.split(':').map(Number);
      startDate.setHours(hours, minutes, 0, 0);
      form.setValue('startOn', startDate);
      form.setValue('endOn', addMinutes(startDate, customDuration));
    }
  }

  function handleCustomTimeChange(timeString: string) {
    setCustomTime(timeString);
    const [hours, minutes] = timeString.split(':').map(Number);
    const startDate = new Date(selectedCalendarDate);
    startDate.setHours(hours, minutes, 0, 0);
    form.setValue('startOn', startDate);
    form.setValue('endOn', addMinutes(startDate, customDuration));
  }

  function handleDurationChange(duration: number) {
    setCustomDuration(duration);
    form.setValue('customDuration', duration);
    const startOn = form.getValues('startOn');
    form.setValue('endOn', addMinutes(startOn, duration));
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-foreground/10 max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Make-up Class</DialogTitle>
          <DialogDescription>
            Reschedule the missed class for this member
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogBody className="space-y-4">
              {/* Make-up credits info */}
              {loadingCredits ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading credits...
                </div>
              ) : creditsInfo && creditsInfo.limit > 0 ? (
                <div className={cn(
                  "rounded-lg p-3 border",
                  creditsInfo.remaining > 0 
                    ? "bg-green-500/10 border-green-500/20" 
                    : "bg-red-500/10 border-red-500/20"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Make-up Credits</span>
                    <Badge variant={creditsInfo.remaining > 0 ? "secondary" : "destructive"}>
                      {creditsInfo.remaining} remaining
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {creditsInfo.used} of {creditsInfo.limit} credits used
                  </p>
                </div>
              ) : null}

              {/* Original class info */}
              <div className="bg-foreground/5 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Original Class</p>
                <p className="font-medium">
                  {originalReservation.programName || 'Unknown Program'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(originalReservation.startOn), 'PPP')} at{' '}
                  {format(new Date(originalReservation.startOn), 'h:mm a')}
                </p>
              </div>

              <Separator className="bg-foreground/10" />

              {/* Date picker */}
              <FormField
                control={form.control}
                name="startOn"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel size="tiny">Make-up Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            if (!date || isDateBlocked(date)) return;
                            
                            // Only update if date (day) actually changed
                            if (!isSameDay(date, selectedCalendarDate)) {
                              const normalizedDate = new Date(date);
                              normalizedDate.setHours(0, 0, 0, 0);
                              setSelectedCalendarDate(normalizedDate);
                              
                              // Reset selections when date changes
                              form.setValue('sessionId', undefined);
                              form.setValue('useCustomTime', false);
                            }
                            
                            // Always update the form field for display
                            field.onChange(date);
                          }}
                          initialFocus
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            if (date < today) return true;
                            return isDateBlocked(date);
                          }}
                          modifiers={{
                            blocked: (date) => isDateBlocked(date),
                          }}
                          modifiersClassNames={{
                            blocked: 'bg-red-100 dark:bg-red-900/20 text-red-400 line-through',
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Time selection */}
              <div className="space-y-3">
                <FormLabel size="tiny">Time Slot</FormLabel>
                
                {selectedDateBlocked ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <CalendarX className="size-4" />
                      <span className="text-sm font-medium">Location Closed</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedDateBlockedReason || 'This date is unavailable for scheduling.'}
                    </p>
                  </div>
                ) : loadingSlots ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableSlots.length > 0 && (
                      <div className="space-y-2">
                        {availableSlots.map((slot) => {
                          const [hours, minutes] = slot.time.split(':').map(Number);
                          const period = hours >= 12 ? 'PM' : 'AM';
                          const displayHours = hours % 12 || 12;
                          const formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
                          
                          return (
                            <RadioBox
                              key={slot.sessionId}
                              value={slot.sessionId}
                              selected={sessionId === slot.sessionId}
                              onSelectChange={(value) => {
                                form.setValue('sessionId', value);
                                form.setValue('useCustomTime', false);
                                
                                // Set time directly here instead of via effect
                                const selectedSlot = availableSlots.find(s => s.sessionId === value);
                                if (selectedSlot) {
                                  const [hours, minutes] = selectedSlot.time.split(':').map(Number);
                                  const startDate = new Date(selectedCalendarDate);
                                  startDate.setHours(hours, minutes, 0, 0);
                                  form.setValue('startOn', startDate);
                                  form.setValue('endOn', addMinutes(startDate, selectedSlot.duration));
                                }
                              }}
                              className="flex items-center justify-between p-3"
                            >
                              <div className="flex items-center gap-2 min-w-0 whitespace-nowrap overflow-hidden">
                                <Clock className="size-4 text-muted-foreground shrink-0" />
                                <span className="shrink-0">{formattedTime}</span>
                                <span className="text-muted-foreground shrink-0">-</span>
                                <span className="text-muted-foreground truncate">{slot.programName}</span>
                              </div>
                              <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                                {slot.availableSpots} spots
                              </Badge>
                            </RadioBox>
                          );
                        })}
                      </div>
                    )}

                    {availableSlots.length === 0 && !useCustomTime && (
                      <p className="text-sm text-muted-foreground py-2">
                        No available sessions on this date
                      </p>
                    )}

                    {/* Custom time option */}
                    <div
                      className={cn(
                        "border rounded-lg p-3 cursor-pointer transition-colors",
                        useCustomTime 
                          ? "border-primary bg-primary/5" 
                          : "border-foreground/10 hover:border-foreground/20"
                      )}
                      onClick={() => handleCustomTimeToggle(true)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="radio"
                          checked={useCustomTime}
                          onChange={() => handleCustomTimeToggle(true)}
                          className="accent-primary"
                        />
                        <span className="font-medium text-sm">Custom time</span>
                      </div>
                      
                      {useCustomTime && (
                        <div className="flex gap-3 mt-3">
                          <div className="flex-1">
                            <label className="text-xs text-muted-foreground mb-1 block">Time</label>
                            <Input
                              type="time"
                              value={customTime}
                              onChange={(e) => handleCustomTimeChange(e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div className="w-24">
                            <label className="text-xs text-muted-foreground mb-1 block">Duration</label>
                            <Input
                              type="number"
                              min={15}
                              max={240}
                              value={customDuration}
                              onChange={(e) => handleDurationChange(parseInt(e.target.value) || 30)}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </DialogBody>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={
                  saving || 
                  selectedDateBlocked ||
                  (!sessionId && !useCustomTime) || 
                  (creditsInfo !== null && creditsInfo.limit > 0 && creditsInfo.remaining <= 0)
                } 
                variant="foreground"
              >
                {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                {creditsInfo !== null && creditsInfo.limit > 0 && creditsInfo.remaining <= 0 
                  ? "No Credits Remaining" 
                  : "Schedule Make-up"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
