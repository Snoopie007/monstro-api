'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
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
import type { CustomFieldDefinition } from '@/types/member'
import type { ImportSource, NewCustomField } from '@/types/migration'
import { useCsvDataset } from '@/hooks/migration/useCsvDataset'
import { useMigrationAnalysis } from '@/hooks/migration/useMigrationAnalysis'
import { useMigrationFixes } from '@/hooks/migration/useMigrationFixes'
import { AUTO_MAP_PATTERNS } from '@/constants/migration'

interface ImportStepperPageProps {
    lid: string
}

type MappingFormValues = {
    fieldMapping: Record<string, string>
    customFieldMapping: Record<string, string>
    includeCustomFields: boolean
}

export function ImportStepperPage({ lid }: ImportStepperPageProps) {
    const stepperRef = useRef<HTMLDivElement & IStepperMethods>(null)
    const [currentStep, setCurrentStep] = useState(1)
    const [importSource, setImportSource] = useState<ImportSource>(null)
    const [isImporting, setIsImporting] = useState(false)

    const [existingCustomFields, setExistingCustomFields] = useState<CustomFieldDefinition[]>([])
    const [newCustomFields, setNewCustomFields] = useState<NewCustomField[]>([])
    const [isLoadingCustomFields, setIsLoadingCustomFields] = useState(true)

    const mappingForm = useForm<MappingFormValues>({
        defaultValues: {
            fieldMapping: {},
            customFieldMapping: {},
            includeCustomFields: false,
        },
    })

    const fieldMapping = useWatch({ control: mappingForm.control, name: 'fieldMapping' }) || {}
    const customFieldMapping = useWatch({ control: mappingForm.control, name: 'customFieldMapping' }) || {}
    const includeCustomFields = useWatch({ control: mappingForm.control, name: 'includeCustomFields' }) || false

    const setFieldMapping = useCallback((value: React.SetStateAction<Record<string, string>>) => {
        const current = mappingForm.getValues('fieldMapping') || {}
        const next = typeof value === 'function' ? value(current) : value
        mappingForm.setValue('fieldMapping', next)
    }, [mappingForm])

    const setCustomFieldMapping = useCallback((value: React.SetStateAction<Record<string, string>>) => {
        const current = mappingForm.getValues('customFieldMapping') || {}
        const next = typeof value === 'function' ? value(current) : value
        mappingForm.setValue('customFieldMapping', next)
    }, [mappingForm])

    const setIncludeCustomFields = useCallback((value: React.SetStateAction<boolean>) => {
        const current = mappingForm.getValues('includeCustomFields') || false
        const next = typeof value === 'function' ? value(current) : value
        mappingForm.setValue('includeCustomFields', next)
    }, [mappingForm])

    const {
        file,
        headers,
        originalRows,
        rows,
        previewRows,
        setRows,
        setPreviewRows,
        onFileChange,
        reset: resetDataset,
        deriveNewCustomFields,
    } = useCsvDataset()

    const analysis = useMigrationAnalysis(lid)
    const fixes = useMigrationFixes({
        analysisResult: analysis.aiAnalysisResult,
        fieldMapping,
        rows,
        originalRows,
        setRows,
        setPreviewRows,
    })

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

    const getMappedColumns = useCallback(() => {
        const mapped = new Set<string>()
        Object.values(fieldMapping).forEach(col => {
            if (col) mapped.add(col)
        })
        Object.values(customFieldMapping).forEach(col => {
            if (col) mapped.add(col)
        })
        return mapped
    }, [fieldMapping, customFieldMapping])

    const initializedFileKeyRef = useRef<string | null>(null)

    useEffect(() => {
        if (!file || !headers.length || !originalRows.length) return

        const fileKey = `${file.name}-${file.size}-${file.lastModified}`
        if (initializedFileKeyRef.current === fileKey) return
        initializedFileKeyRef.current = fileKey

        const autoMapping: Record<string, string> = {}
        const lowerHeaders = headers.map(h => h.toLowerCase())

        for (const [field, patterns] of Object.entries(AUTO_MAP_PATTERNS)) {
            const matchIndex = lowerHeaders.findIndex(h => patterns.includes(h))
            if (matchIndex !== -1) {
                autoMapping[field] = headers[matchIndex]
            }
        }

        setFieldMapping(autoMapping)
        setNewCustomFields(deriveNewCustomFields(new Set(Object.values(autoMapping))))
    }, [file, headers, originalRows, setFieldMapping, deriveNewCustomFields])

    useEffect(() => {
        if (headers.length === 0) return

        const mappedColumns = getMappedColumns()
        const nextDefaults = deriveNewCustomFields(mappedColumns)

        setNewCustomFields(prev => {
            const existingByColumn = new Map(prev.map(f => [f.csvColumn, f]))
            return nextDefaults.map(field => existingByColumn.get(field.csvColumn) || field)
        })
    }, [headers, getMappedColumns, deriveNewCustomFields])

    const resetMappingState = useCallback(() => {
        mappingForm.reset({
            fieldMapping: {},
            customFieldMapping: {},
            includeCustomFields: false,
        })
        setNewCustomFields([])
    }, [mappingForm])

    const handleFileChange = useCallback((nextFile: File | undefined) => {
        analysis.resetAnalysis()
        fixes.resetAppliedCount()
        initializedFileKeyRef.current = null
        onFileChange(nextFile)

        if (!nextFile) {
            resetMappingState()
        }
    }, [analysis, fixes, onFileChange, resetMappingState])

    const handleAiAnalysis = useCallback(async () => {
        // TODO: WALLET BALANCE CHECK
        // Before calling AI analysis, check if the location has sufficient
        // wallet balance. Show a message if balance is too low.
        const result = await analysis.runAnalysis({ headers, rows })
        if (!result?.columnMapping) return

        fixes.resetAppliedCount()

        const autoMappings: Record<string, string> = {}
        for (const [csvHeader, mapping] of Object.entries(result.columnMapping)) {
            if (mapping.suggestedField && mapping.confidence >= 0.75) {
                autoMappings[mapping.suggestedField] = csvHeader
            }
        }

        if (Object.keys(autoMappings).length > 0) {
            setFieldMapping(prev => ({ ...prev, ...autoMappings }))
        }
    }, [analysis, headers, rows, fixes, setFieldMapping])

    const handleSourceSelect = useCallback((source: ImportSource) => {
        setImportSource(source)
        if (source !== 'csv') {
            resetDataset()
            analysis.resetAnalysis()
            fixes.resetAppliedCount()
            resetMappingState()
        }
    }, [resetDataset, analysis, fixes, resetMappingState])

    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'lastRenewalDate']
    const isStep1Valid = importSource === 'csv' && file && headers.length > 0
    const isStep2Valid = requiredFields.every(field => fieldMapping[field])

    return (
        <div className='relative flex h-[calc(100vh-200px)] flex-col'>
            {analysis.isAiAnalyzing ? (
                <div className='absolute inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm'>
                    <div className='flex flex-col items-center gap-4 rounded-lg border border-foreground/10 bg-background/95 p-8 shadow-xl'>
                        <div className='relative'>
                            <Loader2 className='size-10 animate-spin text-foreground' />
                        </div>
                        <div className='text-center'>
                            <p className='text-sm font-medium'>Analyzing your CSV</p>
                            <p className='mt-1 text-xs text-muted-foreground'>
                                AI is mapping columns and detecting data patterns...
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}

            <InteractiveStepper
                ref={stepperRef}
                defaultValue={1}
                onStepChange={setCurrentStep}
                orientation='horizontal'
                className='flex-1 overflow-y-auto py-1'
            >
                <InteractiveStepperItem key='step-1'>
                    <InteractiveStepperIndicator />
                    <InteractiveStepperTitle>Select Source</InteractiveStepperTitle>
                    <InteractiveStepperSeparator />
                </InteractiveStepperItem>

                <InteractiveStepperItem key='step-2'>
                    <InteractiveStepperIndicator />
                    <InteractiveStepperTitle>Map Fields</InteractiveStepperTitle>
                    <InteractiveStepperSeparator />
                </InteractiveStepperItem>

                <InteractiveStepperItem key='step-3'>
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
                        headers={headers}
                        fieldMapping={fieldMapping}
                        setFieldMapping={setFieldMapping}
                        existingCustomFields={existingCustomFields}
                        customFieldMapping={customFieldMapping}
                        setCustomFieldMapping={setCustomFieldMapping}
                        newCustomFields={newCustomFields}
                        setNewCustomFields={setNewCustomFields}
                        isLoadingCustomFields={isLoadingCustomFields}
                        previewData={previewRows}
                        includeCustomFields={includeCustomFields}
                        setIncludeCustomFields={setIncludeCustomFields}
                        aiAnalysisResult={analysis.aiAnalysisResult}
                        aiAnalysisError={analysis.aiAnalysisError}
                        isAiAnalyzing={analysis.isAiAnalyzing}
                        onAiAnalyze={handleAiAnalysis}
                        onApplyAiFixes={fixes.applyAiFixes}
                        aiFixesPendingCount={fixes.pendingAiFixCount}
                        aiFixesAppliedCount={fixes.aiFixesAppliedCount}
                    />
                </InteractiveStepperContent>

                <InteractiveStepperContent step={3} className='overflow-auto'>
                    <PreviewStep
                        lid={lid}
                        file={file}
                        previewData={previewRows}
                        fullData={rows}
                        fieldMapping={fieldMapping}
                        customFieldMapping={customFieldMapping}
                        existingCustomFields={existingCustomFields}
                        newCustomFields={newCustomFields}
                        isImporting={isImporting}
                        setIsImporting={setIsImporting}
                        includeCustomFields={includeCustomFields}
                        pricingIdMapping={analysis.pricingIdMapping}
                    />
                </InteractiveStepperContent>
            </InteractiveStepper>

            <StepperFooter
                stepperRef={stepperRef}
                currentStep={currentStep}
                isStep1Valid={isStep1Valid}
                isStep2Valid={isStep2Valid}
                isImporting={isImporting}
            />
        </div>
    )
}
