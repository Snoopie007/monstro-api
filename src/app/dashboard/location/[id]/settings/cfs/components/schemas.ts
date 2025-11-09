import { z } from "zod";

const FIELD_TYPES = [
	"text",
	"number",
	"date",
	"boolean",
	"select",
	"multi-select",
] as const;

export type FieldType = typeof FIELD_TYPES[number];



export const CustomFieldSchema = z.object({
	name: z.string().min(1, "Field name is required"),
	type: z.enum(FIELD_TYPES),
	placeholder: z.string().optional(),
	helpText: z.string().optional(),
	options: z.array(z.object({
		value: z.string().min(1, "Option value is required"),
		label: z.string().min(1, "Option label is required"),
	})).optional(),
}).refine(
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
		message: "Select and Multi-Select fields must have at least one option with unique values",
		path: ["options"],
	}
);

