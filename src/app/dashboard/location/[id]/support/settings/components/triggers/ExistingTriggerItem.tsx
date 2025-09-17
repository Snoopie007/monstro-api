import { Badge, Button } from "@/components/ui";
import { SupportTrigger } from "@/types";
import { Edit2, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

interface ExistingTriggerItemProps {
  trigger: SupportTrigger;
  handleToggleTrigger: (triggerId: string, isActive: boolean) => void;
  setEditingTrigger: (trigger: SupportTrigger) => void;
  setEditDialogOpen: (open: boolean) => void;
  handleDeleteTrigger: (triggerId: string) => void;
}

export function ExistingTriggerItem({
  trigger,
  handleToggleTrigger,
  setEditingTrigger,
  setEditDialogOpen,
  handleDeleteTrigger,
}: ExistingTriggerItemProps) {
  return (
    <div
      key={trigger.id}
      className="px-3 py-1 border rounded-lg border-foreground/10 hover:bg-background/40 transition-colors"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{trigger.name}</p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            type="button"
            size="sm"
            onClick={() => handleToggleTrigger(trigger.id, !trigger.isActive)}
            className="h-8 w-8 p-0"
          >
            {trigger.isActive ? (
              <ToggleRight size={16} className="text-green-600" />
            ) : (
              <ToggleLeft size={16} className="text-gray-400" />
            )}
          </Button>
          <Button
            variant="ghost"
            type="button"
            size="sm"
            onClick={() => {
              setEditingTrigger(trigger);
              setEditDialogOpen(true);
            }}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <Edit2 size={14} />
          </Button>
          <Button
            variant="ghost"
            type="button"
            size="sm"
            onClick={() => handleDeleteTrigger(trigger.id)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
