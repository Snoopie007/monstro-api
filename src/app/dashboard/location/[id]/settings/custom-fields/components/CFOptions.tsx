import {
	FormControl,
	FormLabel,
	FormItem,
} from "@/components/forms/form";
import { FormField, FormMessage } from "@/components/forms";
import { GripVertical, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/forms/input";
import { UseFormReturn, FieldPath, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { CustomFieldSchema } from "./schemas";
import { toast } from "react-toastify";
import React, { useRef } from "react";
import { ScrollArea } from "@/components/ui/ScrollArea";

interface CFOptionsProps {
	form: UseFormReturn<z.infer<typeof CustomFieldSchema>>;
}

export function CFOptions({ form }: CFOptionsProps) {
	const { append, remove, move, fields } = useFieldArray({
		control: form.control,
		name: "options",
	});

	// Keep track of the dragged item index
	const dragItem = useRef<number | null>(null);

	function handleRemove(index: number) {
		if (fields.length === 1) {
			toast.error("You must have at least one option");
			return;
		}
		remove(index);
	}

	function handleDragStart(e: React.DragEvent, index: number) {
		dragItem.current = index;
		e.dataTransfer.effectAllowed = "move";
	}

	function handleDragOver(e: React.DragEvent) {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
	}

	function handleDrop(e: React.DragEvent, idx: number) {
		e.preventDefault();
		if (dragItem.current !== null && dragItem.current !== idx) {
			move(dragItem.current, idx);
		}
		dragItem.current = null;
	}

	function handleDragEnd() {
		dragItem.current = null;
	}

	return (
		<FormField
			control={form.control}
			name={"options"}
			render={() => (
				<FormItem>
					<FormLabel size="tiny">Options</FormLabel>
					<ScrollArea className="h-[200px] bg-muted/50 rounded-md p-2">
						<div className="space-y-2">
							{fields.map((field, index) => (
								<div
									key={field.id}
									className="flex flex-row items-center justify-between gap-2"
									draggable
									onDragStart={(e) => handleDragStart(e, index)}
									onDragOver={handleDragOver}
									onDrop={(e) => handleDrop(e, index)}
									onDragEnd={handleDragEnd}
									style={{
										opacity:
											dragItem.current === index ? 0.6 : 1,
										cursor: "grab",
									}}
								>
									<GripVertical className="size-4 cursor-grab text-muted-foreground flex-shrink-0" />

									<div className="grid grid-cols-2 gap-2 flex-1">
										<FormField
											control={form.control}
											name={`options.${index}.value` as FieldPath<z.infer<typeof CustomFieldSchema>>}
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Input
															{...field}
															value={typeof field.value === "string" ? field.value : ""}
															className="h-10"
															placeholder="Value"
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name={`options.${index}.label` as FieldPath<z.infer<typeof CustomFieldSchema>>}
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Input
															{...field}
															value={typeof field.value === "string" ? field.value : ""}
															className="h-10"
															placeholder="Label"
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => handleRemove(index)}
										className="size-8 flex-shrink-0"
									>
										<Minus className="size-4 text-red-500" />
									</Button>
								</div>
							))}
						</div>
					</ScrollArea>



					<Button
						type="button"
						variant="ghost"
						size="xs"
						onClick={() => append({ value: "", label: "" })}
						className="bg-foreground/5 border border-foreground/20"
					>
						+ Option
					</Button>
				</FormItem>
			)}
		/>
	);
}