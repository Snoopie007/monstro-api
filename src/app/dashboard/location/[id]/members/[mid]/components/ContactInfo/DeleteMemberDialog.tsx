"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
  Button,
} from "@/components/ui";
import { useState } from "react";
import { tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";
import { Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface DeleteMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  params: { id: string; mid: string };
}

export function DeleteMemberDialog({
  isOpen,
  onClose,
  params,
}: DeleteMemberDialogProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onConfirm() {
    setLoading(true);

    const { result, error } = await tryCatch(
      fetch(`/api/protected/loc/${params.id}/members/${params.mid}`, {
        method: "DELETE",
      })
    );

    setLoading(false);

    if(result?.status === 403) {
      toast.error("You are not authorized to delete this member");
      return;
    }

    if (error || !result || !result.ok) {
      toast.error("Failed to delete member");
      return;
    }

    toast.success("Member deleted successfully");
    onClose();

    // Navigate back to the members list
    router.push(`/dashboard/location/${params.id}/members`);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-sm border-foreground/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            Delete Member
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this member from this location?
            </p>
            <div className="bg-destructive/10 border border-destructive/20 rounded-sm p-3">
              <p className="text-sm text-destructive">
                <strong>Warning:</strong> This action cannot be undone. The
                member will be deleted and will no longer be able to access
                this location.
              </p>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
