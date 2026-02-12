import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import type { CustomFieldDefinition } from "@subtrees/types";

interface CustomFieldValue {
  fieldId: string;
  value: string;
}

interface UseCustomFieldsProps {
  locationId: string;
  memberId?: string; // Optional - for editing existing member
}

interface CustomFieldWithValue extends CustomFieldDefinition {
  value: string;
}

export function useCustomFields({
  locationId,
  memberId,
}: UseCustomFieldsProps) {
  const [fields, setFields] = useState<CustomFieldWithValue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});

  // Fetch custom field definitions
  const fetchFieldDefinitions = async () => {
    try {
      const response = await fetch(
        `/api/protected/loc/${locationId}/cfs`
      );
      const data = await response.json();

      if (data.success) {
        const fieldDefinitions = data.data || [];

        // If we have a memberId, fetch the member's current values
        if (memberId) {
          const memberResponse = await fetch(
            `/api/protected/loc/${locationId}/members/${memberId}/cfs`
          );
          const memberData = await memberResponse.json();

          if (memberData.success) {
            const fieldsWithValues = memberData.data || [];
            setFields(fieldsWithValues);

            // Set initial values
            const initialValues: Record<string, string> = {};
            fieldsWithValues.forEach((field: CustomFieldWithValue) => {
              initialValues[field.id] = field.value || "";
            });
            setValues(initialValues);
          } else {
            // If member data fetch fails, use field definitions with empty values
            const fieldsWithEmptyValues = fieldDefinitions.map(
              (field: CustomFieldDefinition) => ({
                ...field,
                value: "",
              })
            );
            setFields(fieldsWithEmptyValues);

            const initialValues: Record<string, string> = {};
            fieldDefinitions.forEach((field: CustomFieldDefinition) => {
              initialValues[field.id] = "";
            });
            setValues(initialValues);
          }
        } else {
          // For new members, use field definitions with empty values
          const fieldsWithEmptyValues = fieldDefinitions.map(
            (field: CustomFieldDefinition) => ({
              ...field,
              value: "",
            })
          );
          setFields(fieldsWithEmptyValues);

          const initialValues: Record<string, string> = {};
          fieldDefinitions.forEach((field: CustomFieldDefinition) => {
            initialValues[field.id] = "";
          });
          setValues(initialValues);
        }
      } else {
        console.error("Failed to fetch custom field definitions:", data.error);
      }
    } catch (error) {
      console.error("Error fetching custom fields:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save custom field values for a member
  const saveCustomFields = async (targetMemberId: string): Promise<boolean> => {
    try {
      const customFields = Object.entries(values)
        .filter(([, value]) => value.trim() !== "") // Only save non-empty values
        .map(([fieldId, value]) => ({
          fieldId,
          value,
        }));

      if (customFields.length === 0) {
        return true; // No custom fields to save
      }

      const response = await fetch(
        `/api/protected/loc/${locationId}/members/${targetMemberId}/cfs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ customFields }),
        }
      );

      const data = await response.json();

      if (data.success) {
        return true;
      } else {
        console.error("Failed to save custom fields:", data.error);
        toast.error(data.message || "Failed to save custom fields");
        return false;
      }
    } catch (error) {
      console.error("Error saving custom fields:", error);
      toast.error("Error saving custom fields");
      return false;
    }
  };

  // Update a field value
  const updateFieldValue = (fieldId: string, value: string) => {
    setValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  // Get custom fields data for form submission
  const getCustomFieldsData = (): CustomFieldValue[] => {
    return Object.entries(values)
      .filter(([, value]) => value.trim() !== "")
      .map(([fieldId, value]) => ({
        fieldId,
        value,
      }));
  };

  // Reset all values
  const resetValues = () => {
    const emptyValues: Record<string, string> = {};
    fields.forEach((field) => {
      emptyValues[field.id] = "";
    });
    setValues(emptyValues);
  };

  useEffect(() => {
    fetchFieldDefinitions();
  }, [locationId, memberId]);

  return {
    fields,
    values,
    isLoading,
    updateFieldValue,
    saveCustomFields,
    getCustomFieldsData,
    resetValues,
    refetch: fetchFieldDefinitions,
  };
}
