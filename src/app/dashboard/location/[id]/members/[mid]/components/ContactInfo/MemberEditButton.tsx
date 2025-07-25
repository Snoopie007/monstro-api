"use client";
import { useState } from "react";
import {
  Button,
  TooltipTrigger,
  TooltipContent,
  Tooltip,
} from "@/components/ui";
import { Edit } from "lucide-react";
import { EditMemberInfoDialog } from "./EditMemberInfoDialog";

export function MemberEditButton({
  params,
}: {
  params: { id: string; mid: string };
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="bg-foreground/5 size-6 hover:bg-foreground/10"
            onClick={() => setIsEditOpen(true)}
          >
            <Edit className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Edit this member's contact information</p>
        </TooltipContent>
      </Tooltip>
      <EditMemberInfoDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        params={params}
      />
    </>
  );
}
