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

export const customFieldSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Field name is required"),
  type: z.enum(["text", "number", "date", "boolean", "select", "multi-select"]),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    )
    .optional(),
});

export const customFieldsFormSchema = z.object({
  fields: z.array(customFieldSchema),
});

export type CustomFieldFormData = z.infer<typeof customFieldSchema>;
export type CustomFieldsFormData = z.infer<typeof customFieldsFormSchema>;
