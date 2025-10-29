import { z } from "zod";
import type { CustomFieldType } from "@/types/member";

export const customFieldTypeOptions: {
	value: CustomFieldType;
	label: string;
}[] = [
		{ value: "text", label: "Text" },
		{ value: "number", label: "Number" },
		{ value: "date", label: "Date" },
		{ value: "boolean", label: "Checkbox" },
		{ value: "select", label: "Select" },
		{ value: "multi-select", label: "Multi-Select" },
	];

export const customFieldSchema = z
	.object({
		id: z.string().optional(),
		name: z.string().min(1, "Field name is required"),
		type: z.enum([
			"text",
			"number",
			"date",
			"boolean",
			"select",
			"multi-select",
		]),
		placeholder: z.string().optional(),
		helpText: z.string().optional(),
		options: z
			.array(
				z.object({
					value: z.string().min(1, "Option value is required"),
					label: z.string().min(1, "Option label is required"),
				})
			)
			.optional(),
	})
	.refine(
		(data) => {
			// Require options for select/multi-select fields
			if (data.type === "select" || data.type === "multi-select") {
				if (!data.options || data.options.length === 0) {
					return false;
				}

				// Check for duplicate option values
				const values = data.options.map((opt) =>
					opt.value.toLowerCase().trim()
				);
				const uniqueValues = new Set(values);
				if (values.length !== uniqueValues.size) {
					return false;
				}
			}
			return true;
		},
		{
			message:
				"Select and Multi-Select fields must have at least one option with unique values",
			path: ["options"],
		}
	);

export const customFieldsFormSchema = z.object({
	fields: z.array(customFieldSchema),
});

export type CustomFieldFormData = z.infer<typeof customFieldSchema>;
export type CustomFieldsFormData = z.infer<typeof customFieldsFormSchema>;
