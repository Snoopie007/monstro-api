import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { CustomFieldType, MemberPlan } from '@subtrees/types';

/**
 * Represents a single validation error
 */
export interface ValidationError {
  rowIndex: number;
  column: string;
  fieldKey: string;
  value: unknown;
  error: string;
}

/**
 * Represents the complete validation result for an import
 */
export interface ValidationResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ValidationError[];
  errorsByRow: Map<number, ValidationError[]>;
  errorsByColumn: Map<string, ValidationError[]>;
}

/**
 * Validates email format using RFC 5322 regex
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  // RFC 5322 simplified regex for email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true };
}

/**
 * Validates phone number using libphonenumber-js with US region
 */
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' };
  }
  
  try {
    const parsed = parsePhoneNumberFromString(phone, 'US');
    
    if (!parsed || !parsed.isValid()) {
      return { valid: false, error: 'Invalid phone number. Use US format: (555) 123-4567 or 555-123-4567' };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: 'Invalid phone number. Use US format: (555) 123-4567 or 555-123-4567' };
  }
}

/**
 * Validates date in YYYY-MM-DD or MM/DD/YYYY format
 */
export function validateDate(dateStr: string): { valid: boolean; error?: string } {
  if (!dateStr || typeof dateStr !== 'string') {
    return { valid: false, error: 'Date is required' };
  }
  
  // Check YYYY-MM-DD format
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  // Check MM/DD/YYYY format
  const usRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  
  let dateObj: Date | null = null;
  
  if (isoRegex.test(dateStr)) {
    dateObj = new Date(dateStr);
  } else if (usRegex.test(dateStr)) {
    const [month, day, year] = dateStr.split('/');
    dateObj = new Date(`${year}-${month}-${day}`);
  } else {
    return { valid: false, error: 'Invalid date format. Use: YYYY-MM-DD (e.g., 2024-01-15) or MM/DD/YYYY (e.g., 01/15/2024)' };
  }

  if (isNaN(dateObj.getTime())) {
    return { valid: false, error: 'Invalid date value. Use: YYYY-MM-DD (e.g., 2024-01-15) or MM/DD/YYYY (e.g., 01/15/2024)' };
  }
  
  return { valid: true };
}

/**
 * Validates non-negative integer
 */
export function validateInteger(value: string | number | undefined): { valid: boolean; error?: string } {
  if (value === undefined || value === null || value === '') {
    return { valid: true }; // Optional field - empty is valid
  }
  
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  
  if (isNaN(num)) {
    return { valid: false, error: 'Must be a valid number' };
  }
  
  if (num < 0) {
    return { valid: false, error: 'Must be a non-negative number (0 or greater)' };
  }
  
  return { valid: true };
}

/**
 * Validates optional date (allows empty values)
 */
export function validateOptionalDate(dateStr: string | undefined): { valid: boolean; error?: string } {
  if (!dateStr || dateStr.trim() === '') {
    return { valid: true }; // Optional field - empty is valid
  }
  
  return validateDate(dateStr);
}

/**
 * Validates custom field based on its type
 */
export function validateCustomField(
  value: unknown,
  fieldType: CustomFieldType
): { valid: boolean; error?: string } {
  if (value === null || value === undefined || value === '') {
    return { valid: true }; // Custom fields are optional
  }
  
  switch (fieldType) {
    case 'number': {
      const num = Number(value);
      if (isNaN(num)) {
        return { valid: false, error: `Expected number, got ${typeof value}` };
      }
      return { valid: true };
    }
    
    case 'date': {
      if (typeof value !== 'string') {
        return { valid: false, error: 'Date must be a string' };
      }
      return validateDate(value);
    }
    
    case 'boolean': {
      if (typeof value === 'boolean') {
        return { valid: true };
      }
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (['true', 'false', 'yes', 'no', '1', '0'].includes(lower)) {
          return { valid: true };
        }
      }
      return { valid: false, error: 'Expected boolean value' };
    }
    
    default:
      return { valid: true };
  }
}

/**
 * Validates import data with required fields and custom fields
 */
export interface ValidateImportDataOptions {
  fieldMapping: Record<string, string>; // Maps fieldKey -> csvColumnName
  customFieldMapping?: Record<string, string>; // Maps fieldId -> csvColumnName
  customFields?: Array<{ key: string; type: CustomFieldType }>;
  allowEmptyOptionalFields?: boolean;
  plans?: MemberPlan[];
  isLoadingPlans?: boolean;
}

export function validateImportData(
  data: Record<string, unknown>[],
  options: ValidateImportDataOptions
): ValidationResult {
  const errors: ValidationError[] = [];
  const errorsByRow = new Map<number, ValidationError[]>();
  const errorsByColumn = new Map<string, ValidationError[]>();

  const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'lastRenewalDate'];
  const customFields = options.customFields || [];
  const fieldMapping = options.fieldMapping || {};
  const customFieldMapping = options.customFieldMapping || {};

  // Extract all valid pricing option IDs from plans
  const validPricingIds = new Set<string>();
  if (options.plans) {
    options.plans.forEach(plan => {
      if (plan.pricingOptions) {
        plan.pricingOptions.forEach(pricing => {
          if (pricing.id) validPricingIds.add(pricing.id);
        });
      }
    });
  }

  data.forEach((row, rowIndex) => {
    const rowErrors: ValidationError[] = [];

    // Validate required fields
    for (const fieldKey of requiredFields) {
      const csvColumn = fieldMapping[fieldKey];

      if (!csvColumn) {
        continue;
      }

      const value = row[csvColumn];

      if (!value || (typeof value === 'string' && value.trim() === '')) {
        const error: ValidationError = {
          rowIndex,
          column: csvColumn,
          fieldKey,
          value,
          error: `${fieldKey} is required`,
        };
        rowErrors.push(error);
        errors.push(error);

        if (!errorsByColumn.has(csvColumn)) {
          errorsByColumn.set(csvColumn, []);
        }
        errorsByColumn.get(csvColumn)!.push(error);
        continue;
      }

      // Field-specific validation
      let validation: { valid: boolean; error?: string } = { valid: true };

      switch (fieldKey) {
        case 'email':
          validation = validateEmail(String(value));
          break;
        case 'phone':
          validation = validatePhone(String(value));
          break;
        case 'lastRenewalDate':
          validation = validateDate(String(value));
          break;
        case 'firstName':
        case 'lastName':
          if (typeof value !== 'string' || value.trim().length === 0) {
            validation = { valid: false, error: `${fieldKey} must be a non-empty string` };
          }
          break;
      }

      if (!validation.valid) {
        const error: ValidationError = {
          rowIndex,
          column: csvColumn,
          fieldKey,
          value,
          error: validation.error || `Invalid ${fieldKey}`,
        };
        rowErrors.push(error);
        errors.push(error);

        if (!errorsByColumn.has(csvColumn)) {
          errorsByColumn.set(csvColumn, []);
        }
        errorsByColumn.get(csvColumn)!.push(error);
      }
    }

    // Validate pricingPlanId if mapped (only when plans are loaded)
    const pricingPlanIdColumn = fieldMapping['pricingPlanId'];
    if (pricingPlanIdColumn && !options.isLoadingPlans) {
      const value = row[pricingPlanIdColumn];

      if (value && value !== '') {
        const pricingId = String(value).trim();

        // Check if the pricing ID exists in valid options
        if (!validPricingIds.has(pricingId)) {
          const error: ValidationError = {
            rowIndex,
            column: pricingPlanIdColumn,
            fieldKey: 'pricingPlanId',
            value,
            error: `Invalid Pricing Plan ID: "${pricingId}". This ID does not match any existing pricing option in your location.`,
          };
          rowErrors.push(error);
          errors.push(error);

          if (!errorsByColumn.has(pricingPlanIdColumn)) {
            errorsByColumn.set(pricingPlanIdColumn, []);
          }
          errorsByColumn.get(pricingPlanIdColumn)!.push(error);
        }
      }
    }

    // Validate custom fields
    for (const customField of customFields) {
      const value = row[customField.key];
      const validation = validateCustomField(value, customField.type);
      
      if (!validation.valid) {
        const error: ValidationError = {
          rowIndex,
          column: customField.key,
          fieldKey: customField.key,
          value,
          error: validation.error || `Invalid ${customField.key}`,
        };
        rowErrors.push(error);
        errors.push(error);
        
        if (!errorsByColumn.has(customField.key)) {
          errorsByColumn.set(customField.key, []);
        }
        errorsByColumn.get(customField.key)!.push(error);
      }
    }
    
    if (rowErrors.length > 0) {
      errorsByRow.set(rowIndex, rowErrors);
    }
  });
  
  const validRows = data.length - errorsByRow.size;
  
  return {
    totalRows: data.length,
    validRows,
    invalidRows: errorsByRow.size,
    errors,
    errorsByRow,
    errorsByColumn,
  };
}
