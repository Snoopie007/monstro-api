"use client";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogBody,
	DialogTrigger,
	Button,
	DialogClose,
} from "@/components/ui";
import { useState } from "react";
import { tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";
import { Loader2, AlertTriangle, Trash } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
	params: { id: string; mid: string };
	className?: string;
}

export function DeleteMemberDialog({ params, className }: Props) {
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const router = useRouter();

	async function onConfirm() {
		setLoading(true);

		const { result, error } = await tryCatch(
			fetch(`/api/protected/loc/${params.id}/members/${params.mid}`, {
				method: "DELETE",
			})
		);

		setLoading(false);

		if (result?.status === 403) {
			toast.error("You are not authorized to delete this member");
			return;
		}

		if (error || !result || !result.ok) {
			toast.error("Failed to delete member");
			return;
		}

		toast.success("Member deleted successfully");

		// Navigate back to the members list
		router.push(`/dashboard/location/${params.id}/members`);
	}



	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="icon" className="size-6 bg-foreground/5"			>
					<Trash className="size-3 text-red-500" />
				</Button>
			</DialogTrigger>
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
					<DialogClose asChild>
						<Button variant="outline">
							Cancel
						</Button>
					</DialogClose>
					<Button
						variant="destructive"
						disabled={loading}
						onClick={onConfirm}
					>
						{loading && <Loader2 className="mr-2 size-4 animate-spin" />}
						Delete Member
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
