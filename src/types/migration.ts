import type { CustomFieldType } from '@/types/member'

export type ImportSource = 'csv' | 'gohighlevel' | null

export interface NewCustomField {
    csvColumn: string
    fieldName: string
    fieldType: CustomFieldType
    selected: boolean
    sampleValues: string[]
}

export function inferFieldType(values: string[]): CustomFieldType {
    const nonEmpty = values.filter(v => v?.trim())
    if (nonEmpty.length === 0) return 'text'

    const datePattern = /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/
    if (nonEmpty.every(v => datePattern.test(v))) return 'date'

    if (nonEmpty.every(v => !isNaN(Number(v)) && v.trim() !== '')) return 'number'

    const boolValues = ['true', 'false', 'yes', 'no', '1', '0']
    if (nonEmpty.every(v => boolValues.includes(v.toLowerCase()))) return 'boolean'

    const unique = new Set(nonEmpty.map(v => v.toLowerCase()))
    if (unique.size <= 5 && nonEmpty.length >= 3) return 'select'

    return 'text'
}
