import { useMemo } from 'react'
import { validateImportData } from '@/libs/validation/importValidation'
import type { MemberPlan } from '@subtrees/types'
import type { CustomFieldDefinition } from '@/types/member'
import type { NewCustomField } from '@/types/migration'

type Params = {
    fullData: Record<string, string>[]
    previewData: Record<string, string>[]
    fieldMapping: Record<string, string>
    customFieldMapping: Record<string, string>
    existingCustomFields: CustomFieldDefinition[]
    newCustomFields: NewCustomField[]
    includeCustomFields: boolean
    plans?: MemberPlan[]
    isLoadingPlans?: boolean
    pricingIdMapping?: Record<string, Record<string, string>>
}

export function useMigrationPreview({
    fullData,
    previewData,
    fieldMapping,
    customFieldMapping,
    existingCustomFields,
    newCustomFields,
    includeCustomFields,
    plans,
    isLoadingPlans,
    pricingIdMapping,
}: Params) {
    const validationResult = useMemo(() => {
        return validateImportData(fullData, {
            fieldMapping,
            customFieldMapping,
            customFields: [
                ...existingCustomFields.map(f => ({ key: f.id, type: f.type })),
                ...newCustomFields.filter(f => f.selected).map(f => ({ key: f.csvColumn, type: f.fieldType })),
            ],
            plans: plans || [],
            isLoadingPlans,
            pricingIdMapping,
        })
    }, [fullData, fieldMapping, customFieldMapping, existingCustomFields, newCustomFields, plans, isLoadingPlans, pricingIdMapping])

    const mappedExistingFields = useMemo(() => {
        if (!includeCustomFields) return []
        return existingCustomFields.filter(f => customFieldMapping[f.id])
    }, [includeCustomFields, existingCustomFields, customFieldMapping])

    const selectedNewFields = useMemo(() => {
        if (!includeCustomFields) return []
        return newCustomFields.filter(f => f.selected)
    }, [includeCustomFields, newCustomFields])

    const totalCustomFieldsCount = mappedExistingFields.length + selectedNewFields.length

    const getMappedValue = (row: Record<string, string>, fieldKey: string) => {
        const csvColumn = fieldMapping[fieldKey]
        if (!csvColumn) return '-'

        const rawValue = row[csvColumn] || '-'

        if (fieldKey === 'pricingPlanId' && pricingIdMapping?.[csvColumn]) {
            const mappedId = pricingIdMapping[csvColumn][rawValue]
            return mappedId || rawValue
        }

        return rawValue
    }

    const getCustomFieldValue = (row: Record<string, string>, fieldId: string) => {
        const csvColumn = customFieldMapping[fieldId]
        return csvColumn ? row[csvColumn] || '-' : '-'
    }

    return {
        validationResult,
        mappedExistingFields,
        selectedNewFields,
        totalCustomFieldsCount,
        getMappedValue,
        getCustomFieldValue,
        previewData,
    }
}
