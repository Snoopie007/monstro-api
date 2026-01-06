"use client";

import { use, useEffect, useState } from "react";
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

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch closures (exceptions)
      const closuresRes = await fetch(`/api/protected/loc/${locationId}/exceptions?initiator=holiday&initiator=maintenance`);
      if (closuresRes.ok) {
        const data = await closuresRes.json();
        setClosures(data);
      }

      // Fetch location settings for holiday defaults
      const settingsRes = await fetch(`/api/protected/loc/${locationId}/settings`);
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setHolidaySettings(settings?.holidays);
      }
    } catch (error) {
      console.error('Failed to fetch closures data:', error);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [locationId]);

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
            onUpdate={fetchData}
          />

          <CustomClosures
            locationId={locationId}
            closures={closures}
            onRefetch={fetchData}
          />
        </div>
      )}
    </div>
  );
}

