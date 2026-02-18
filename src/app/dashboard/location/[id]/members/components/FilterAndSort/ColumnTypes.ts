import { CustomFieldDefinition } from "@/types/member";

export enum FilterInputType {
  TEXT = 'text',
  SELECT = 'select',
  MULTI_SELECT = 'multi-select',
  DATE = 'date',
  NUMBER = 'number'
}

export interface ColumnFilterConfig {
  id: string;
  label: string;
  inputType: FilterInputType;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export interface ColumnMetadata {
  [key: string]: ColumnFilterConfig;
}

export const memberColumnMetadata: ColumnMetadata = {
  status: {
    id: 'status',
    label: 'Status',
    inputType: FilterInputType.SELECT,
    options: [
      { value: 'incomplete', label: 'Incomplete' },
      { value: 'active', label: 'Active' },
      { value: 'past_due', label: 'Past Due' },
      { value: 'canceled', label: 'Canceled' },
      { value: 'paused', label: 'Paused' },
      { value: 'trialing', label: 'Trialing' },
      { value: 'unpaid', label: 'Unpaid' },
      { value: 'incomplete_expired', label: 'Incomplete Expired' },
      { value: 'archived', label: 'Archived' }
    ],
    placeholder: 'Select status'
  },
  gender: {
    id: 'gender',
    label: 'Gender',
    inputType: FilterInputType.SELECT,
    options: [
      { value: 'Male', label: 'Male' },
      { value: 'Female', label: 'Female' },
      { value: 'Other', label: 'Other' }
    ],
    placeholder: 'Select gender'
  },
  // Text-based columns (default behavior)
  firstName: {
    id: 'firstName',
    label: 'First Name',
    inputType: FilterInputType.TEXT,
    placeholder: 'Enter first name'
  },
  lastName: {
    id: 'lastName',
    label: 'Last Name',
    inputType: FilterInputType.TEXT,
    placeholder: 'Enter last name'
  },
  email: {
    id: 'email',
    label: 'Email',
    inputType: FilterInputType.TEXT,
    placeholder: 'Enter email'
  },
  phone: {
    id: 'phone',
    label: 'Phone',
    inputType: FilterInputType.TEXT,
    placeholder: 'Enter phone number'
  }
};


// Helper function to get custom field configuration
export const getCustomFieldConfig = (fieldId: string, customFields?: CustomFieldDefinition[]): ColumnFilterConfig | null => {
  const field = customFields?.find(cf => cf.id === fieldId);
  if (!field) return null;

  switch (field.type) {
    case 'select':
      return {
        id: `custom-field-${fieldId}`,
        label: field.name,
        inputType: FilterInputType.SELECT,
        options: field.options || [],
        placeholder: `Select ${field.name}`
      };

    case 'boolean':
      return {
        id: `custom-field-${fieldId}`,
        label: field.name,
        inputType: FilterInputType.SELECT,
        options: [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' }
        ],
        placeholder: `Select ${field.name}`
      };

    case 'number':
      return {
        id: `custom-field-${fieldId}`,
        label: field.name,
        inputType: FilterInputType.NUMBER,
        placeholder: `Enter ${field.name}`
      };

    case 'date':
      return {
        id: `custom-field-${fieldId}`,
        label: field.name,
        inputType: FilterInputType.DATE,
        placeholder: `Select ${field.name}`
      };

    default:
      return {
        id: `custom-field-${fieldId}`,
        label: field.name,
        inputType: FilterInputType.TEXT,
        placeholder: `Enter ${field.name}`
      };
  }
};
