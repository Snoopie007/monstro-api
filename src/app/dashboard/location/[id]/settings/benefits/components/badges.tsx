"use client";
import { useState } from "react";
import { VendorBadge, VendorLevel } from "@/types";

import Image from "next/image";
import { cn } from "@/libs/utils";

import { Badge } from "@/components/ui";
import { Progress } from "@/components/ui/progress";
import { badges, AchivementBadge } from "./data";

export function VendorBadges({ level }: { level: VendorLevel }) {
  const [search, setSearch] = useState("");
  return (
    <div className="space-y-4">
      <div>
        <input
          type="text"
          placeholder="Search badges"
          className="w-full border border-foreground/10 rounded-xs text-xs p-2"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {badges.map((badge) => (
          <BadgeItem
            key={badge.id}
            badge={badge}
            vendorBadges={level.badges || []}
          />
        ))}
      </div>
    </div>
  );
}

function BadgeItem({
  badge,
  vendorBadges,
}: {
  badge: AchivementBadge;
  vendorBadges: VendorBadge[];
}) {
  const vendorBadge = vendorBadges?.find(
    (item: VendorBadge) => item.badgeId === badge.id
  );

  return (
    <div
      className={cn(
        "col-span-1 max-h-[260px] h-[260px] border border-foreground/10 rounded-xs p-6 text-left relative",
        vendorBadge?.completed ? "border-green-500" : ""
      )}
    >
      <div className="flex flex-col gap-2 items-center relative">
        <Badge className="text-xs  font-semibold rounded-sm py-1 px-2 leading-none bg-indigo-600 text-white">
          {badge.points} points
        </Badge>
        <div className="relative flex-initial">
          <Image
            src={`/images/icons/badges/${badge.icon}`}
            alt={badge.name}
            width={100}
            height={100}
            className={cn(
              "grayscale -z-10",
              vendorBadge?.completed ? "grayscale-0" : " grayscale"
            )}
          />
          <div className="absolute bottom-0 right-0 w-full h-full z-20 flex flex-col items-center justify-center">
            <div className="mt-[40px] w-full flex flex-col items-center justify-center">
              <Progress
                value={
                  ((vendorBadge ? vendorBadge.progress : 0) /
                    (badge.requiredActionCount || 1)) *
                  100
                }
                className="h-2 w-[80%] bg-black/50"
              />
              <p className="text-xs font-medium mt-1 bg-black/50 rounded-xs px-2 inline-flex items-center justify-center">
                {vendorBadge ? vendorBadge.progress : 0}/
                {badge.requiredActionCount}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1 flex-1 text-center  ">
          <span
            className={cn(
              "text-sm font-medium",
              vendorBadge?.completed ? "text-green-500" : ""
            )}
          >
            {badge.name}
          </span>
          <span
            className={cn(
              "text-xs text-muted-foreground",
              vendorBadge?.completed ? "text-green-500/50" : ""
            )}
          >
            {badge.description}
          </span>
        </div>
      </div>
      {vendorBadge?.completed && (
        <div className="text-xs absolute bottom-3 text-green-500  left-0 text-center w-full">
          Completed on {new Date(vendorBadge.claimed!).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
