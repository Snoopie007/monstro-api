"use client";

import React, { useState, useCallback } from "react";
import { RiDeleteBinLine } from "@remixicon/react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

import { cn, getTimezoneOffset, sleep, tryCatch } from "@/libs/utils";
import { format, getDay } from "date-fns";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	Input,
	Textarea,
	FormControl,
	FormField,
	FormMessage,
	FormItem,
	FormLabel,
	FormDescription,
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/forms";
import { NewProgramSchema } from "@/app/dashboard/location/[id]/programs/schemas";
import SessionComponent from "@/app/dashboard/location/[id]/programs/components/ProgramSessions";
import { useStaffLocations } from "@/hooks/useStaffs";

interface ProgramDialogProps {
	program: z.infer<typeof NewProgramSchema> | null;
	isOpen: boolean;
	onClose: () => void;
	onSave: (program: z.infer<typeof NewProgramSchema>) => void;
	onDelete: (programId: string) => void;
	lid: string;
	initialDateTime?: Date; // Optional initial date/time from clicked time slot
}

/**
 * ProgramDialog - Dialog for creating and editing programs and their recurring sessions
 * 
 * This dialog handles program creation with session configuration.
 * Used when creating new calendar events from the calendar interface.
 */
export function ProgramDialog({
	program,
	isOpen,
	onClose,
	onSave,
	onDelete,
	lid,
	initialDateTime,
}: ProgramDialogProps) {
	const [loading, setLoading] = useState(false);

	const { sls, error, isLoading } = useStaffLocations(lid);

	// Utility functions to convert Date to session format
	const getSessionDayFromDate = (date: Date): number => {
		const jsDay = getDay(date); // 0 = Sunday, 1 = Monday, etc.
		return jsDay === 0 ? 7 : jsDay; // Convert to 1-7 where 1 = Monday
	};

	const getSessionTimeFromDate = (date: Date): string => {
		return format(date, "HH:mm");
	};

	// Create initial session data based on clicked date/time
	const getInitialSession = useCallback(() => {
		if (initialDateTime) {
			return {
				day: getSessionDayFromDate(initialDateTime),
				time: getSessionTimeFromDate(initialDateTime),
				duration: 30,
			};
		}
		return {
			day: 1,
			time: "12:00",
			duration: 30,
		};
	}, [initialDateTime]);

	const form = useForm<z.infer<typeof NewProgramSchema>>({
		resolver: zodResolver(NewProgramSchema),
		defaultValues: {
			description: "",
			name: "",
			capacity: 0,
			minAge: 0,
			maxAge: 0,
			sessions: [getInitialSession()],
			instructorId: undefined,
		},
		mode: "onBlur", // Changed from "onChange" to reduce re-renders
	});

	// Reset form when program changes
	React.useEffect(() => {
		if (program) {
			form.reset({
				name: program.name || "",
				description: program.description || "",
				capacity: program.capacity || 0,
				minAge: program.minAge || 0,
				maxAge: program.maxAge || 0,
				sessions: program.sessions || [
					{
						day: 1,
						time: "12:00",
						duration: 30,
					},
				],
				instructorId: program.instructorId || undefined,
			});
		} else {
			form.reset({
				description: "",
				name: "",
				capacity: 0,
				minAge: 0,
				maxAge: 0,
				sessions: [getInitialSession()],
				instructorId: undefined,
			});
		}
	}, [program, getInitialSession]);

	async function onSubmit(v: z.infer<typeof NewProgramSchema>) {
		if (loading) return; // Prevent multiple submissions

		setLoading(true);

		try {
			const offsetString = getTimezoneOffset();
			const { result, error } = await tryCatch(
				fetch(`/api/protected/loc/${lid}/programs`, {
					method: "POST",
					body: JSON.stringify(v),
					headers: {
						'Content-Type': 'application/json',
						'X-Timezone-Offset': offsetString,
					}
				})
			);

			await sleep(1000);
			setLoading(false);

			if (error || !result || !result.ok) {
				toast.error(error?.message || "Something went wrong");
				return;
			}
			toast.success("Program created successfully");
			form.reset();
			onSave(v);
			onClose();
		} catch (error) {
			console.error("Error creating program:", error);
			toast.error("Failed to create program");
			setLoading(false);
		}
	}

	const handleDelete = () => {
		if (program && "id" in program && program.id) {
			onDelete(program.id.toString());
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[540px] w-[540px] max-h-[90vh] overflow-y-auto border-border/20">
				<DialogHeader>
					<DialogTitle>
						{program && "id" in program ? "Edit Program" : "Create Program"}
					</DialogTitle>
					<DialogDescription className="sr-only">
						{program && "id" in program
							? "Edit the details of this program"
							: "Add a new program to your calendar"}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form className="grid gap-4 p-4">
						<fieldset>
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel size="tiny">Program Name</FormLabel>
										<FormControl>
											<Input
												type="text"
												placeholder="Program Name"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</fieldset>

						<fieldset>
							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel size="tiny">Program Description</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Program Description"
												className="resize-none border-border/20"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</fieldset>

						<fieldset>
							<FormField
								control={form.control}
								name="instructorId"
								render={({ field }) => (
									<FormItem>
										<FormLabel size={"tiny"}>Instructor</FormLabel>
										<FormDescription>Select a staff member that will be assigned to the program by default. Leave blank to not assign a staff.</FormDescription>
										<FormControl>
											<Select onValueChange={(v) => field.onChange(v)} value={field.value || "null"}>
												<SelectTrigger className={cn("")}>
													<SelectValue placeholder="Select a instructor" />
												</SelectTrigger>
												<SelectContent>
													{sls.map((sl) => {
												const staff = sl.staff;
												return (
													<SelectItem key={staff?.id ?? ''} value={staff?.id ? String(staff.id) : ''}>{staff?.firstName} {staff?.lastName}</SelectItem>
												)
											})}
													<SelectItem value={"null"} key={"none"}>None</SelectItem>
												</SelectContent>
											</Select>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</fieldset>

						<fieldset className="flex flex-row items-center gap-2 w-full">
							<FormField
								control={form.control}
								name="capacity"
								render={({ field }) => (
									<FormItem>
										<FormLabel size={"tiny"}>Capacity</FormLabel>
										<FormControl>
											<Input
												type="number"
												className={cn()}
												placeholder={"Capacity"}
												{...field}
												onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="minAge"
								render={({ field }) => (
									<FormItem className="flex-1">
										<FormLabel size={"tiny"}>Min Age</FormLabel>
										<FormControl>
											<Input
												type="number"
												className={cn()}
												placeholder={"Min Age"}
												{...field}
												onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="maxAge"
								render={({ field }) => (
									<FormItem className="flex-1">
										<FormLabel size={"tiny"}>Max Age</FormLabel>
										<FormControl>
											<Input
												type="number"
												className={cn()}
												placeholder={"Max Age"}
												{...field}
												onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</fieldset>

						<div>
							<SessionComponent control={form.control} />
						</div>

					</form>
				</Form>

				<DialogFooter className="flex-row sm:justify-between border-t border-border/20 py-2 px-4">
					{program && "id" in program && (
						<Button
							variant="outline"
							size="icon"
							onClick={handleDelete}
							aria-label="Delete program"
						>
							<RiDeleteBinLine size={16} aria-hidden="true" />
						</Button>
					)}
					<div className="flex flex-1 justify-end gap-2">
						<Button variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button
							variant="foreground"
							onClick={form.handleSubmit(onSubmit)}
							disabled={
								loading ||
								!form.formState.isValid ||
								form.formState.isSubmitting
							}
							className={cn(
								"children:hidden",
								loading && "children:inline-block"
							)}
						>
							<Loader2 className="mr-2 size-3.5 animate-spin" />
							Save
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
