import { Button } from "@/components/ui";
import { SupportTrigger } from "@/types";
import { Edit2, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { sleep, tryCatch } from "@/libs/utils";
import { toast } from "sonner";

interface TriggerItemProps {
	trigger: SupportTrigger;
	onSelect: (trigger: SupportTrigger) => void;
	onUpdate: (trigger: SupportTrigger | null, type: 'create' | 'update' | 'delete') => void;
}

export function TriggerItem({
	trigger,
	onSelect,
	onUpdate,
}: TriggerItemProps) {


	async function handleEdit() {
		onSelect(trigger);
	}

	async function handleDelete() {
		onUpdate(null, 'delete');
	}

	async function handleToggle() {
		if (!trigger) return
		const { result, error } = await tryCatch(
			fetch(`/api/protected/bots/${trigger.supportAssistantId}/triggers/${trigger.id}`, {
				method: "PATCH",
				body: JSON.stringify({ isActive: !trigger.isActive }),
			})
		)
		await sleep(1000)
		if (error || !result || !result.ok) {
			return toast.error("Something went wrong")
		}
		toast.success("Trigger toggled")
		onUpdate(trigger, 'update');
	}


	return (
		<div key={trigger.id}    >
			<div className="flex items-center justify-between">
				<p className="text-sm font-medium">{trigger.name}</p>
				<div className="flex items-center gap-1">
					<Button variant="ghost" type="button" size="icon" onClick={() => handleToggle()}
						className="size-8"
					>
						{trigger.isActive ? (
							<ToggleRight size={16} className="text-green-600" />
						) : (
							<ToggleLeft size={16} className="text-gray-400" />
						)}
					</Button>
					<Button variant="ghost"
						type="button"
						size="icon"
						onClick={handleEdit}
						className="size-8 text-muted-foreground hover:text-foreground"
					>
						<Edit2 size={16} />
					</Button>
					<Button
						variant="ghost"
						type="button"
						size="icon"
						onClick={handleDelete}
						className="size-8 text-muted-foreground hover:text-destructive"
					>
						<Trash2 size={16} />
					</Button>
				</div>
			</div>
		</div >
	);
}
