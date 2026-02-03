'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Papa from 'papaparse'
import {
    InteractiveStepper,
    InteractiveStepperItem,
    InteractiveStepperIndicator,
    InteractiveStepperTitle,
    InteractiveStepperSeparator,
    InteractiveStepperContent,
    IStepperMethods,
} from '@/components/ui/stepper'
import { SelectSourceStep } from './SelectSourceStep'
import { MapFieldsStep } from './MapFieldsStep'
import { PreviewStep } from './PreviewStep'
import { StepperFooter } from './StepperFooter'
import type { CustomFieldDefinition, CustomFieldType } from '@/types'

export type ImportSource = 'csv' | 'gohighlevel' | null

export interface NewCustomField {
    csvColumn: string
    fieldName: string
    fieldType: CustomFieldType
    selected: boolean
    sampleValues: string[]
}

interface ImportStepperPageProps {
    lid: string
}

// Infer field type from CSV values
function inferFieldType(values: string[]): CustomFieldType {
    const nonEmpty = values.filter(v => v?.trim())
    if (nonEmpty.length === 0) return 'text'

    // Check if all values are dates (YYYY-MM-DD or common formats)
    const datePattern = /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/
    if (nonEmpty.every(v => datePattern.test(v))) return 'date'

    // Check if all values are numbers
    if (nonEmpty.every(v => !isNaN(Number(v)) && v.trim() !== '')) return 'number'

    // Check if all values are boolean-like
    const boolValues = ['true', 'false', 'yes', 'no', '1', '0']
    if (nonEmpty.every(v => boolValues.includes(v.toLowerCase()))) return 'boolean'

    // Check if limited unique values (might be select)
    const unique = new Set(nonEmpty.map(v => v.toLowerCase()))
    if (unique.size <= 5 && nonEmpty.length >= 3) return 'select'

    return 'text'
}

export function ImportStepperPage({ lid }: ImportStepperPageProps) {
    const stepperRef = useRef<HTMLDivElement & IStepperMethods>(null)

    const [importSource, setImportSource] = useState<ImportSource>(null)
    const [file, setFile] = useState<File | undefined>(undefined)
    const [csvHeaders, setCsvHeaders] = useState<string[]>([])
    const [csvPreviewData, setCsvPreviewData] = useState<Record<string, string>[]>([])
    const [csvFullData, setCsvFullData] = useState<Record<string, string>[]>([])
    const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
    const [isImporting, setIsImporting] = useState(false)

    // Custom fields state
    const [existingCustomFields, setExistingCustomFields] = useState<CustomFieldDefinition[]>([])
    const [customFieldMapping, setCustomFieldMapping] = useState<Record<string, string>>({})
    const [newCustomFields, setNewCustomFields] = useState<NewCustomField[]>([])
    const [isLoadingCustomFields, setIsLoadingCustomFields] = useState(true)
    const [includeCustomFields, setIncludeCustomFields] = useState(false)

    // Fetch existing custom field definitions
    useEffect(() => {
        async function fetchCustomFields() {
            try {
                const response = await fetch(`/api/protected/loc/${lid}/cfs`)
                const data = await response.json()
                if (data.success) {
                    setExistingCustomFields(data.data || [])
                }
            } catch (error) {
                console.error('Error fetching custom fields:', error)
            } finally {
                setIsLoadingCustomFields(false)
            }
        }
        fetchCustomFields()
    }, [lid])

    const handleFileChange = useCallback((newFile: File | undefined) => {
        setFile(newFile)

        if (!newFile) {
            setCsvHeaders([])
            setCsvPreviewData([])
            setCsvFullData([])
            setFieldMapping({})
            setCustomFieldMapping({})
            setNewCustomFields([])
            return
        }

        Papa.parse(newFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const headers = results.meta.fields || []
                const allData = results.data as Record<string, string>[]
                const previewData = allData.slice(0, 10)

                setCsvHeaders(headers)
                setCsvPreviewData(previewData)
                setCsvFullData(allData)

                // Auto-map fields that match common patterns
                const autoMapping: Record<string, string> = {}
                const lowerHeaders = headers.map(h => h.toLowerCase())

                const fieldPatterns: Record<string, string[]> = {
                    firstName: ['firstname', 'first_name', 'first name', 'fname'],
                    lastName: ['lastname', 'last_name', 'last name', 'lname'],
                    email: ['email', 'e-mail', 'emailaddress', 'email_address'],
                    phone: ['phone', 'phonenumber', 'phone_number', 'mobile', 'cell'],
                    lastRenewalDate: ['lastrenewaldate', 'last_renewal_date', 'renewal_date', 'renewaldate'],
                    // Auto-mapping for optional fields
                    classCredits: ['classcredits', 'class_credits', 'credits', 'remaining_credits', 'class credits'],
                    paymentTermsLeft: ['paymenttermsleft', 'payment_terms_left', 'terms_left', 'payments_remaining', 'terms remaining'],
                    backdateStartDate: ['backdate', 'backdate_start', 'backdate_start_date', 'original_start', 'start_date_backdate'],
                    termEndDate: ['term_end_date', 'termenddate', 'end_date', 'plan_end_date', 'membership_end'],
                    pricingPlanId: ['pricing_plan_id', 'pricingplanid', 'plan_id', 'planid', 'pricing_id', 'pricingid', 'pricingoptionid', 'pricing_option_id'],
                }

                for (const [field, patterns] of Object.entries(fieldPatterns)) {
                    const matchIndex = lowerHeaders.findIndex(h => patterns.includes(h))
                    if (matchIndex !== -1) {
                        autoMapping[field] = headers[matchIndex]
                    }
                }

                setFieldMapping(autoMapping)

                // Initialize new custom fields from unmapped columns
                const mappedColumns = new Set(Object.values(autoMapping))
                const unmappedHeaders = headers.filter(h => !mappedColumns.has(h))

                const newFields: NewCustomField[] = unmappedHeaders.map(header => {
                    const columnValues = allData.slice(0, 20).map(row => row[header])
                    return {
                        csvColumn: header,
                        fieldName: header.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                        fieldType: inferFieldType(columnValues),
                        selected: false,
                        sampleValues: columnValues.filter(v => v?.trim()).slice(0, 3),
                    }
                })

                setNewCustomFields(newFields)
            },
            error: (error) => {
                console.error('CSV parsing error:', error)
            },
        })
    }, [])

    const handleSourceSelect = useCallback((source: ImportSource) => {
        setImportSource(source)
        if (source !== 'csv') {
            setFile(undefined)
            setCsvHeaders([])
            setCsvPreviewData([])
            setCsvFullData([])
            setFieldMapping({})
            setCustomFieldMapping({})
            setNewCustomFields([])
        }
    }, [])

    // Compute unmapped columns (excluding required mappings and custom field mappings)
    const getMappedColumns = useCallback(() => {
        const mapped = new Set<string>()
        Object.values(fieldMapping).forEach(col => col && mapped.add(col))
        Object.values(customFieldMapping).forEach(col => col && mapped.add(col))
        return mapped
    }, [fieldMapping, customFieldMapping])

    // Update newCustomFields when mappings change
    useEffect(() => {
        if (csvHeaders.length === 0) return

        const mappedColumns = getMappedColumns()
        const unmappedHeaders = csvHeaders.filter(h => !mappedColumns.has(h))

        setNewCustomFields(prev => {
            // Keep existing selections for columns that are still unmapped
            const existingByColumn = new Map(prev.map(f => [f.csvColumn, f]))

            return unmappedHeaders.map(header => {
                const existing = existingByColumn.get(header)
                if (existing) return existing

                const columnValues = csvFullData.slice(0, 20).map(row => row[header])
                return {
                    csvColumn: header,
                    fieldName: header.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    fieldType: inferFieldType(columnValues),
                    selected: false,
                    sampleValues: columnValues.filter(v => v?.trim()).slice(0, 3),
                }
            })
        })
    }, [csvHeaders, csvFullData, getMappedColumns])

    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'lastRenewalDate']
    const isStep1Valid = importSource === 'csv' && file && csvHeaders.length > 0
    const isStep2Valid = requiredFields.every(field => fieldMapping[field])

    return (
        <div className='flex flex-col h-[calc(100vh-200px)]'>
            <InteractiveStepper
                ref={stepperRef}
                defaultValue={1}
                orientation='horizontal'
                className='flex-1 overflow-y-auto py-1'
            >
                <InteractiveStepperItem key="step-1">
                    <InteractiveStepperIndicator />
                    <InteractiveStepperTitle>Select Source</InteractiveStepperTitle>
                    <InteractiveStepperSeparator />
                </InteractiveStepperItem>

                <InteractiveStepperItem key="step-2">
                    <InteractiveStepperIndicator />
                    <InteractiveStepperTitle>Map Fields</InteractiveStepperTitle>
                    <InteractiveStepperSeparator />
                </InteractiveStepperItem>

                <InteractiveStepperItem key="step-3">
                    <InteractiveStepperIndicator />
                    <InteractiveStepperTitle>Preview & Import</InteractiveStepperTitle>
                </InteractiveStepperItem>

                <InteractiveStepperContent step={1} className='overflow-auto'>
                    <SelectSourceStep
                        importSource={importSource}
                        onSourceSelect={handleSourceSelect}
                        file={file}
                        onFileChange={handleFileChange}
                    />
                </InteractiveStepperContent>

                <InteractiveStepperContent step={2} className='overflow-auto'>
                    <MapFieldsStep
                        headers={csvHeaders}
                        fieldMapping={fieldMapping}
                        setFieldMapping={setFieldMapping}
                        existingCustomFields={existingCustomFields}
                        customFieldMapping={customFieldMapping}
                        setCustomFieldMapping={setCustomFieldMapping}
                        newCustomFields={newCustomFields}
                        setNewCustomFields={setNewCustomFields}
                        isLoadingCustomFields={isLoadingCustomFields}
                        previewData={csvPreviewData}
                        includeCustomFields={includeCustomFields}
                        setIncludeCustomFields={setIncludeCustomFields}
                    />
                </InteractiveStepperContent>

                <InteractiveStepperContent step={3} className='overflow-auto'>
                    <PreviewStep
                        lid={lid}
                        file={file}
                        previewData={csvPreviewData}
                        fullData={csvFullData}
                        fieldMapping={fieldMapping}
                        customFieldMapping={customFieldMapping}
                        existingCustomFields={existingCustomFields}
                        newCustomFields={newCustomFields}
                        isImporting={isImporting}
                        setIsImporting={setIsImporting}
                        includeCustomFields={includeCustomFields}
                    />
                </InteractiveStepperContent>
            </InteractiveStepper>

            <StepperFooter
                stepperRef={stepperRef}
                isStep1Valid={isStep1Valid}
                isStep2Valid={isStep2Valid}
                isImporting={isImporting}
            />
        </div>
    )
}
