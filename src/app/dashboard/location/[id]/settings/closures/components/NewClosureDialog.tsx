"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";

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
import { ClosureSchema, type ClosureFormData } from "../schemas";
import { RadioBox } from "@/components/forms/radio-box";

interface NewClosureDialogProps {
  locationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewClosureDialog({
  locationId,
  open,
  onOpenChange,
  onSuccess,
}: NewClosureDialogProps) {
  const [saving, setSaving] = useState(false);

  const form = useForm<ClosureFormData>({
    resolver: zodResolver(ClosureSchema),
    defaultValues: {
      type: 'holiday',
      occurrenceDate: new Date(),
      endDate: undefined,
      sessionId: undefined,
      reason: '',
    },
  });

  async function onSubmit(data: ClosureFormData) {
    setSaving(true);

    const { result, error } = await tryCatch(
      fetch(`/api/protected/loc/${locationId}/exceptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occurrenceDate: data.occurrenceDate.toISOString(),
          endDate: data.endDate?.toISOString(),
          sessionId: data.sessionId || null,
          initiator: data.type,
          reason: data.reason || null,
        }),
      })
    );

    setSaving(false);

    if (error || !result?.ok) {
      toast.error('Failed to create closure');
      return;
    }

    toast.success('Closure added successfully');
    form.reset();
    onSuccess?.();
  }

  function handleClose() {
    form.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-foreground/10 max-w-md">
        <DialogHeader>
          <DialogTitle>Add Closure</DialogTitle>
          <DialogDescription>
            Schedule a closure for holidays, maintenance, or special events
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogBody className="space-y-4">
              {/* Type selection */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel size="tiny">Closure Type</FormLabel>
                    <FormControl>
                      <div className="flex gap-4">
                        <RadioBox
                          value="holiday"
                          selected={field.value === 'holiday'}
                          onSelectChange={field.onChange}
                          className="flex-1"
                        >
                          Holiday
                        </RadioBox>
                        <RadioBox
                          value="maintenance"
                          selected={field.value === 'maintenance'}
                          onSelectChange={field.onChange}
                          className="flex-1"
                        >
                          Maintenance
                        </RadioBox>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date selection */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="occurrenceDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel size="tiny">Start Date</FormLabel>
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
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel size="tiny">
                        End Date <span className="text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
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
                              {field.value ? format(field.value, "PPP") : "Same day"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            disabled={(date) => {
                              const startDate = form.getValues('occurrenceDate');
                              return startDate ? date < startDate : false;
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Reason */}
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel size="tiny">
                      Reason <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Christmas Day, Staff Training..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </DialogBody>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} variant="foreground">
                {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Add Closure
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

