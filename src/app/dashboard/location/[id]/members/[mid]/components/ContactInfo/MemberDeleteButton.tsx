"use client";
import { useState } from "react";
import {
  Button,
  TooltipTrigger,
  TooltipContent,
  Tooltip,
} from "@/components/ui";
import { Trash2 } from "lucide-react";
import { DeleteMemberDialog } from "./DeleteMemberDialog";
import { cn } from "@/libs/utils";

export function MemberDeleteButton({
  params,
  className
}: {
  params: { id: string; mid: string };
  className?: string
}) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("bg-foreground/5 size-7 hover:bg-destructive/10 rounded-l-none flex-1", className)}
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="size-3 text-destructive" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Delete this member from this location</p>
        </TooltipContent>
      </Tooltip>
      <DeleteMemberDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        params={params}
      />
    </>
  );
}
