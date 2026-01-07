"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { format, addMinutes } from "date-fns";
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

interface ScheduleMakeupDialogProps {
  locationId: string;
  memberId: string;
  originalReservation: {
    id: string;
    programName?: string;
    startOn: Date | string;
    programId?: string;
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
                          onSelect={(date) => date && field.onChange(date)}
                          initialFocus
                          disabled={(date) => date < new Date()}
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
                disabled={saving || (!sessionId && !useCustomTime)} 
                variant="foreground"
              >
                {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Schedule Make-up
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

