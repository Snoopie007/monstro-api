"use client";

import { use, useEffect, useState, useCallback } from "react";
import { Separator } from "@/components/ui";
import { HolidayDefaults, CustomClosures } from "./components";
import type { ReservationException } from "@/types/reservation";
import type { HolidaySettings } from "@/types/location";

interface ClosuresPageProps {
  params: Promise<{ id: string }>;
}

export default function ClosuresPage({ params }: ClosuresPageProps) {
  const { id: locationId } = use(params);
  const [closures, setClosures] = useState<ReservationException[]>([]);
  const [holidaySettings, setHolidaySettings] = useState<HolidaySettings | undefined>();
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // Fetch closures (exceptions) and settings in parallel
      const [closuresRes, settingsRes] = await Promise.all([
        fetch(`/api/protected/loc/${locationId}/exceptions?initiator=holiday&initiator=maintenance`),
        fetch(`/api/protected/loc/${locationId}/settings`)
      ]);

      if (closuresRes.ok) {
        const data = await closuresRes.json();
        setClosures(data);
      }

      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setHolidaySettings(settings?.holidays);
      }
    } catch (error) {
      console.error('Failed to fetch closures data:', error);
    }
    if (showLoading) setLoading(false);
  }, [locationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Holidays & Closures</h1>
        <p className="text-muted-foreground">
          Manage holiday schedules and facility closures
        </p>
      </div>

      <Separator className="bg-foreground/10" />

      {loading ? (
        <div className="space-y-4">
          <div className="h-64 bg-foreground/5 animate-pulse rounded-lg" />
          <div className="h-48 bg-foreground/5 animate-pulse rounded-lg" />
        </div>
      ) : (
        <div className="space-y-6">
          <HolidayDefaults
            locationId={locationId}
            initialSettings={holidaySettings}
            onUpdate={() => fetchData(false)}
          />

          <CustomClosures
            locationId={locationId}
            closures={closures}
            onRefetch={() => fetchData(false)}
          />
        </div>
      )}
    </div>
  );
}

