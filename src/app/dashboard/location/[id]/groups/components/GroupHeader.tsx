"use client";

import { Badge, Card } from "@/components/ui";
import { Lock, Users } from "lucide-react";
import Image from "next/image";
import { Group } from "@subtrees/types/group";

type GroupHeaderProps = {
  group: Group;
};

export function GroupHeader({ group }: GroupHeaderProps) {

  return (
    <Card className="overflow-hidden border-foreground/10 bg-gradient-to-b from-background/40 to-background">
      <div className="relative h-56 w-full">
        <Image
          src={
            group.coverImage ??
            "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80"
          }
          alt={`${group.name} cover`}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/40 to-background" />
      </div>

      <div className="-mt-20 flex flex-col gap-6 px-6 pb-6">
        <div className="flex flex-wrap items-end gap-4">

          <div className="flex flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="flex items-center gap-1 rounded-full border-foreground/30 text-xs"
              >
                <Lock size={14} />
                Private group
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-foreground/30 text-xs"
              >
                Since {new Date().getFullYear()}
              </Badge>
            </div>
            <div>
              <h1 className="relative z-50 text-3xl font-semibold tracking-tight">
                {group.name}
              </h1>
              {group.description && (
                <p className="z-50 mt-1 text-base text-muted-foreground">
                  {group.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span className="font-semibold text-foreground">
                {Intl.NumberFormat().format(group.memberCount ?? 0)}
              </span>
              members
            </div>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">
              Members sharing wins and teardown replays daily
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}


