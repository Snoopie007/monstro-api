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

export function MemberDeleteButton({
  params,
}: {
  params: { id: string; mid: string };
}) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="bg-foreground/5 size-6 hover:bg-destructive/10"
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
