import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  customFieldsFormSchema,
  type CustomFieldsFormData,
  type CustomFieldFormData,
} from "./schemas";
import type { MemberField } from "@/types/member";

interface UseCustomFieldsProps {
  locationId: string;
}

export function useCustomFields({ locationId }: UseCustomFieldsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<CustomFieldsFormData>({
    resolver: zodResolver(customFieldsFormSchema),
    defaultValues: {
      fields: [],
    },
  });

  const { fields, append, remove, update } = form.watch("fields")
    ? {
        fields: form.watch("fields"),
        append: (field: CustomFieldFormData) => {
          const currentFields = form.getValues("fields");
          form.setValue("fields", [...currentFields, field]);
        },
        remove: (index: number) => {
          const currentFields = form.getValues("fields");
          form.setValue(
            "fields",
            currentFields.filter((_, i) => i !== index)
          );
        },
        update: (index: number, field: CustomFieldFormData) => {
          const currentFields = form.getValues("fields");
          currentFields[index] = field;
          form.setValue("fields", currentFields);
        },
      }
    : { fields: [], append: () => {}, remove: () => {}, update: () => {} };

  // Fetch existing custom fields for this location
  const fetchCustomFields = async () => {
    console.log("Fetching custom fields for location:", locationId);
    setIsLoading(true);

    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/locations/${locationId}/custom-fields`);
      // const data = await response.json();

      // Mock data for now
      const mockFields: CustomFieldFormData[] = [
        {
          id: "field_1",
          name: "Emergency Contact",
          type: "text",
          required: true,
          placeholder: "Enter emergency contact name",
          helpText: "Person to contact in case of emergency",
        },
        {
          id: "field_2",
          name: "Membership Type",
          type: "select",
          required: true,
          options: [
            { value: "basic", label: "Basic" },
            { value: "premium", label: "Premium" },
            { value: "vip", label: "VIP" },
          ],
        },
        {
          id: "field_3",
          name: "Waiver Signed",
          type: "boolean",
          required: true,
          helpText: "Has the member signed the liability waiver?",
        },
      ];

      form.setValue("fields", mockFields);
      console.log("Custom fields loaded:", mockFields);
    } catch (error) {
      console.error("Error fetching custom fields:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save custom fields
  const saveCustomFields = async (data: CustomFieldsFormData) => {
    console.log("Saving custom fields:", data);

    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/locations/${locationId}/custom-fields`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data.fields),
      // });

      console.log("Custom fields saved successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving custom fields:", error);
    }
  };

  // Add new field
  const addField = () => {
    const newField: CustomFieldFormData = {
      name: "",
      type: "text",
      required: false,
      placeholder: "",
      helpText: "",
    };
    append(newField);
    console.log("Added new field");
  };

  // Remove field
  const removeField = (index: number) => {
    remove(index);
    console.log("Removed field at index:", index);
  };

  // Duplicate field
  const duplicateField = (index: number) => {
    const fieldToDuplicate = fields[index];
    const duplicatedField: CustomFieldFormData = {
      ...fieldToDuplicate,
      id: undefined, // Remove ID so it gets treated as new
      name: `${fieldToDuplicate.name} (Copy)`,
    };
    append(duplicatedField);
    console.log("Duplicated field:", fieldToDuplicate);
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditing) {
      // Cancel editing - reset form to original values
      fetchCustomFields();
    }
    setIsEditing(!isEditing);
    console.log("Toggled edit mode:", !isEditing);
  };

  // Initialize data on mount
  useEffect(() => {
    fetchCustomFields();
  }, [locationId]);

  return {
    // Form state
    form,
    fields,
    isEditing,
    isLoading,

    // Actions
    toggleEditMode,
    addField,
    removeField,
    duplicateField,
    saveCustomFields,

    // Form handlers
    onSubmit: form.handleSubmit(saveCustomFields),
  };
}
