// components/CheckinButton.tsx
"use client";

import { useState } from "react";
import { CalendarEvent } from "@subtrees/types/vendor/calendar";
import { tryCatch } from "@/libs/utils";
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { Check, Loader2 } from "lucide-react";

interface CheckinButtonProps {
  memberId: string;
  event: CalendarEvent;
  lid: string;
  rid: string;
  onUpdate?: () => void; // New callback prop for successful updates
}

export function CheckinButton({
  memberId,
  event,
  lid,
  rid,
  onUpdate,
}: CheckinButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      const url = `/api/protected/loc/${lid}/members/${memberId}/attendances/${rid}`;
      const payload = {
        startTime: event.start,
        endTime: event.end,
        checkInTime: new Date().toISOString(),
        sessionId: event.data?.sessionId,
        reservationId: event.data?.reservationId,
      };

      const { result, error } = await tryCatch(
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
      );

      if (error || !result?.ok) {
        throw error || new Error("Failed to check in");
      }

      setIsCheckedIn(true);

      // Call the update callback after successful check-in
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error checking in:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isWithinTimeWindow = () => {
    const now = new Date();
    const start = new Date(event.start);
    const end = new Date(event.end);
    const buffer = 15 * 60 * 1000; // 15 minute buffer
    return (
      now >= new Date(start.getTime() - buffer) &&
      now <= new Date(end.getTime() + buffer)
    );
  };

  if (!isWithinTimeWindow()) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="xs"
          className={`p-1 rounded text-xs border-foreground/10 ${
            isCheckedIn
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-primary hover:bg-green-800 text-white"
          }`}
          onClick={handleCheckIn}
          disabled={isLoading || isCheckedIn}
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Check In</p>
      </TooltipContent>
    </Tooltip>
  );
}
