"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { format, addMinutes, addDays, isSameDay } from "date-fns";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";

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
  originalReservation: {
    id: string;
    programName?: string;
    startOn: Date | string;
    programId?: string;
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

  const selectedDate = form.watch('startOn');
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

  // Fetch available slots when date changes
  useEffect(() => {
    if (!selectedDate || !open) return;

    async function fetchSlots() {
      setLoadingSlots(true);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
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
  }, [selectedDate, locationId, originalReservation.programId, open]);

  // Update end time when session is selected
  useEffect(() => {
    if (sessionId && !useCustomTime) {
      const slot = availableSlots.find(s => s.sessionId === sessionId);
      if (slot) {
        const [hours, minutes] = slot.time.split(':').map(Number);
        const startDate = new Date(selectedDate);
        startDate.setHours(hours, minutes, 0, 0);
        const endDate = addMinutes(startDate, slot.duration);
        
        form.setValue('startOn', startDate);
        form.setValue('endOn', endDate);
      }
    }
  }, [sessionId, useCustomTime, availableSlots, selectedDate]);

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
    onOpenChange(false);
  }

  function handleCustomTimeToggle(useCustom: boolean) {
    form.setValue('useCustomTime', useCustom);
    if (useCustom) {
      form.setValue('sessionId', undefined);
      // Set default custom time
      const startDate = new Date(selectedDate);
      startDate.setHours(12, 0, 0, 0);
      const duration = form.getValues('customDuration');
      form.setValue('startOn', startDate);
      form.setValue('endOn', addMinutes(startDate, duration));
    }
  }

  function handleCustomTimeChange(timeString: string) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const startDate = new Date(selectedDate);
    startDate.setHours(hours, minutes, 0, 0);
    const duration = form.getValues('customDuration');
    form.setValue('startOn', startDate);
    form.setValue('endOn', addMinutes(startDate, duration));
  }

  function handleDurationChange(duration: number) {
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
                          onSelect={(date) => date && !isDateBlocked(date) && field.onChange(date)}
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
                
                {loadingSlots ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Available slots */}
                    {availableSlots.length > 0 && (
                      <div className="space-y-2">
                        {availableSlots.map((slot) => (
                          <RadioBox
                            key={slot.sessionId}
                            value={slot.sessionId}
                            selected={sessionId === slot.sessionId}
                            onSelectChange={(value) => {
                              form.setValue('sessionId', value);
                              form.setValue('useCustomTime', false);
                            }}
                            className="flex items-center justify-between p-3"
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="size-4 text-muted-foreground" />
                              <span>{slot.time}</span>
                              <span className="text-muted-foreground">-</span>
                              <span className="text-muted-foreground">{slot.programName}</span>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {slot.availableSpots} spots
                            </Badge>
                          </RadioBox>
                        ))}
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
                              defaultValue="12:00"
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
                              defaultValue={30}
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

