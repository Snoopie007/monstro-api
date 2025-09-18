"use client";

import React, { useState, useEffect } from "react";
import { useFieldArray, UseFormReturn } from "react-hook-form";
import { z } from "zod";

import {
	Button,
	Dialog,
	DialogContent,
	DialogTrigger,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	Input,
} from "@/components/ui";
import { FormControl, FormItem, FormField, FormLabel, Label, Textarea } from "@/components/forms";
import { VisuallyHidden } from "react-aria";
import { QAEntry } from "@/types/knowledgeBase";
import { KnowledgeBaseSchema } from "@/libs/FormSchemas/";
import { Form } from "@/components/forms";
import { Trash2 } from "lucide-react";

interface QAEntryFormProps {
	form: UseFormReturn<z.infer<typeof KnowledgeBaseSchema>>;

}

export function QAEntryForm({
	form,
}: QAEntryFormProps) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const { fields, remove, append } = useFieldArray({
		control: form.control,
		name: "qa_entries",
	});

	async function handleSubmit(v: z.infer<typeof KnowledgeBaseSchema>) {
		if (!form.formState.isValid) return;


		//Call API
	};


	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" variant="ghost" className="hover:bg-foreground/10">
					Q&A Entry
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl p-4">
				<VisuallyHidden>
					<DialogTitle></DialogTitle>
					<DialogDescription></DialogDescription>
				</VisuallyHidden>
				<Form {...form}>
					<form className="space-y-2">

						<fieldset className="space-y-2">
							<FormLabel size="sm">Q & A</FormLabel>
							{fields.map((field, i) => (
								<div key={i}>
									<div className="flex gap-1 items-center">
										<FormField
											key={field.id}
											control={form.control}
											name={`qa_entries.${i}.question`}
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Input {...field} className="w-full" placeholder="Question" />
													</FormControl>

												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name={`qa_entries.${i}.answer`}
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Input {...field} className="w-full" placeholder="Answer" />
													</FormControl>
												</FormItem>
											)}
										/>
									</div>
									<Button type="button" variant="ghost" size="icon"
										className="rounded-sm size-5 hover:bg-red-500 hover:text-white transition-all duration-200"
										onClick={() => remove(i)}>
										<Trash2 className="size-3.5" />
									</Button>
								</div>
							))}

						</fieldset>


						<DialogFooter className="flex gap-2 pt-2 justify-end">
							<Button type="button" size="sm"
								onClick={form.handleSubmit(handleSubmit)}
								disabled={form.formState.isSubmitting || !form.formState.isValid}
								variant="foreground">
								Save
							</Button>
							<Button type="button" size="sm"
								variant="outline"
								onClick={() => setOpen(false)}
								disabled={form.formState.isSubmitting}
							>
								Cancel
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
