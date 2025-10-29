import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import {
  customFieldsFormSchema,
  type CustomFieldsFormData,
  type CustomFieldFormData,
} from "./schemas";

interface UseCustomFieldsProps {
  locationId: string;
  initialFields?: CustomFieldFormData[];
}

export function useCustomFields({
  locationId,
  initialFields = [],
}: UseCustomFieldsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CustomFieldsFormData>({
    resolver: zodResolver(customFieldsFormSchema),
    defaultValues: {
      fields: initialFields,
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
    : { fields: [], append: () => { }, remove: () => { }, update: () => { } };

  // Fetch existing custom fields for this location
  const fetchCustomFields = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/protected/loc/${locationId}/custom-fields`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch custom fields");
      }

      if (data.success) {
        form.setValue("fields", data.data || []);
      } else {
        throw new Error(data.message || "Failed to fetch custom fields");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch custom fields";
      console.error("Error fetching custom fields:", error);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Save custom fields
  const saveCustomFields = async (data: CustomFieldsFormData) => {
    setError(null);
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/protected/loc/${locationId}/custom-fields`,
        {
          method: "POST",
          body: JSON.stringify({
            fields: data.fields,
          }),
        }
      );
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to save custom fields");
      }

      if (responseData.success) {
        toast.success("Custom fields saved successfully");
      } else {
        throw new Error(responseData.message || "Failed to save custom fields");
      }

      setIsEditing(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save custom fields";
      console.error("Error saving custom fields:", error);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Add new field
  const addField = () => {
    const newField: CustomFieldFormData = {
      name: "",
      type: "text",
      placeholder: "",
      helpText: "",
      options: [],
    };
    append(newField);
  };

  // Remove field
  const removeField = (index: number) => {
    remove(index);
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
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditing) {
      // Cancel editing - reset form to original values
      if (initialFields.length > 0) {
        form.setValue("fields", initialFields);
      } else {
        fetchCustomFields();
      }
    }
    setIsEditing(!isEditing);
    setError(null); // Clear any existing errors when toggling modes
  };

  // Initialize data on mount only if no initial fields provided
  useEffect(() => {
    if (initialFields.length === 0) {
      fetchCustomFields();
    }
  }, [locationId]);

  return {
    // Form state
    form,
    fields,
    isEditing,
    isSaving,
    isLoading,
    error,

    // Actions
    toggleEditMode,
    addField,
    removeField,
    duplicateField,
    saveCustomFields,
    fetchCustomFields,

    // Form handlers
    onSubmit: form.handleSubmit(saveCustomFields),
  };
}
