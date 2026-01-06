"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Separator } from "@/components/ui";
import { Checkbox, Form, FormField, FormItem, FormControl, FormLabel, FormDescription, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Input } from "@/components/forms";
import { tryCatch } from "@/libs/utils";
import { COMMON_HOLIDAYS, HolidayDefaultsSchema, type HolidayDefaultsFormData } from "../schemas";
import type { HolidaySettings } from "@/types/location";

interface HolidayDefaultsProps {
  locationId: string;
  initialSettings?: HolidaySettings;
  onUpdate?: () => void;
}

export function HolidayDefaults({ locationId, initialSettings, onUpdate }: HolidayDefaultsProps) {
  const [saving, setSaving] = useState(false);

  const form = useForm<HolidayDefaultsFormData>({
    resolver: zodResolver(HolidayDefaultsSchema),
    defaultValues: {
      blockedHolidays: initialSettings?.blockedHolidays || [],
      defaultBehavior: initialSettings?.defaultBehavior || 'block_all',
      advanceBlockDays: initialSettings?.advanceBlockDays || 7,
      autoNotifyMembers: initialSettings?.autoNotifyMembers ?? true,
    },
  });

  async function onSubmit(data: HolidayDefaultsFormData) {
    setSaving(true);
    
    const { result, error } = await tryCatch(
      fetch(`/api/protected/loc/${locationId}/settings/holidays`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    );

    setSaving(false);

    if (error || !result?.ok) {
      toast.error('Failed to save holiday settings');
      return;
    }

    toast.success('Holiday settings saved');
    onUpdate?.();
  }

  const blockedHolidays = form.watch('blockedHolidays');

  function toggleHoliday(holidayId: string) {
    const current = form.getValues('blockedHolidays');
    if (current.includes(holidayId)) {
      form.setValue('blockedHolidays', current.filter(id => id !== holidayId));
    } else {
      form.setValue('blockedHolidays', [...current, holidayId]);
    }
  }

  return (
    <Card className="border-foreground/10">
      <CardHeader>
        <CardTitle className="text-lg">Default Holidays</CardTitle>
        <CardDescription>
          Select which common holidays should automatically block new reservations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Holiday checkboxes grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {COMMON_HOLIDAYS.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-foreground/5 hover:bg-foreground/10 transition-colors cursor-pointer"
                  onClick={() => toggleHoliday(holiday.id)}
                >
                  <Checkbox
                    checked={blockedHolidays.includes(holiday.id)}
                    onCheckedChange={() => toggleHoliday(holiday.id)}
                  />
                  <span className="text-sm font-medium">{holiday.name}</span>
                </div>
              ))}
            </div>

            <Separator className="bg-foreground/10" />

            {/* Behavior settings */}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="defaultBehavior"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel size="tiny">Holiday Behavior</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select behavior" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="block_all">Block all reservations</SelectItem>
                        <SelectItem value="block_new_only">Block new reservations only</SelectItem>
                        <SelectItem value="notify_only">Notify only (don't block)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      What happens when a holiday is detected
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="advanceBlockDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel size="tiny">Advance Block Days</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={30}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Days before holiday to start blocking
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>

            {/* Auto notify checkbox */}
            <FormField
              control={form.control}
              name="autoNotifyMembers"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 p-3 bg-foreground/5 rounded-lg">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="flex-1">
                    <FormLabel className="cursor-pointer">
                      Automatically notify members
                    </FormLabel>
                    <FormDescription>
                      Send notifications when reservations are affected by holidays
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={saving} variant="foreground">
              {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Save Holiday Settings
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

