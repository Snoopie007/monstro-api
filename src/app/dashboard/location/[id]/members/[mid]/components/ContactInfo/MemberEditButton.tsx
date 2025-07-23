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
            variant="secondary"
            size="xs"
            onClick={() => setIsEditOpen(true)}
          >
            <Edit size={12} className="mr-1" />
            <span className="text-xs font-medium">Edit</span>
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
