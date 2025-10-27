'use client'

import { useState, useEffect } from 'react'
import {
    CustomFieldInput,
    type CustomFieldDefinition,
} from './CustomFieldInput'
import { CustomFieldDisplay } from './CustomFieldDisplay'
import { Button } from '@/components/ui/button'
import { ChevronsUpDown, CircleFadingPlusIcon, Loader2, SaveIcon } from 'lucide-react'
import { toast } from 'react-toastify'
import {
    CardTitle, Collapsible, CollapsibleContent, CollapsibleTrigger, EmptyHeader,
    EmptyMedia, EmptyTitle, EmptyDescription, Empty
} from '@/components/ui'

interface CustomFieldsWithValues extends CustomFieldDefinition {
    value: string
}

interface CustomFieldsSectionProps {
    memberId: string
    locationId: string
    editable?: boolean
    title?: string
    variant?: 'card' | 'section' | 'inline'
    showEmptyFields?: boolean
}

export function CustomFieldsBox({
    memberId,
    locationId,
    editable = false,
    title = 'Custom Fields',
    showEmptyFields = false,
}: CustomFieldsSectionProps) {
    const [fields, setFields] = useState<CustomFieldsWithValues[]>([])
    const [loading, setLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [editValues, setEditValues] = useState<Record<string, string>>({})
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [open, setOpen] = useState(true)

    // Fetch custom fields and values
    const fetchCustomFields = async () => {
        setLoading(true)
        try {
            const response = await fetch(
                `/api/protected/loc/${locationId}/members/${memberId}/custom-fields`
            )
            const data = await response.json()

            if (data.success) {
                setFields(data.data || [])
                const initialValues: Record<string, string> = {}
                data.data?.forEach((field: CustomFieldsWithValues) => {
                    initialValues[field.id] = field.value || ''
                })
                setEditValues(initialValues)
            } else {
                console.error('Failed to fetch custom fields:', data.error)
                toast.error('Failed to load custom fields')
            }
        } catch (error) {
            console.error('Error fetching custom fields:', error)
            toast.error('Error loading custom fields')
        } finally {
            setLoading(false)
        }
    }

    // Save custom field values
    const saveCustomFields = async () => {
        setIsSaving(true)
        setErrors({})

        try {
            const customFields = Object.entries(editValues).map(
                ([fieldId, value]) => ({
                    fieldId,
                    value,
                })
            )

            const response = await fetch(
                `/api/protected/loc/${locationId}/members/${memberId}/custom-fields`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ customFields }),
                }
            )

            const data = await response.json()

            if (data.success) {
                toast.success('Custom fields updated successfully')
                await fetchCustomFields() // Refresh data
            } else {
                toast.error(data.message || 'Failed to save custom fields')
            }
        } catch (error) {
            console.error('Error saving custom fields:', error)
            toast.error('Error saving custom fields')
        } finally {
            setIsSaving(false)
        }
    }

    // Handle field value change
    const handleFieldChange = (fieldId: string, value: string) => {
        setEditValues((prev) => ({
            ...prev,
            [fieldId]: value,
        }))
        // Clear error for this field
        if (errors[fieldId]) {
            setErrors((prev) => {
                const newErrors = { ...prev }
                delete newErrors[fieldId]
                return newErrors
            })
        }
    }

    useEffect(() => {
        fetchCustomFields()
    }, [memberId, locationId])

    // Filter fields based on showEmptyFields setting
    const displayFields = showEmptyFields
        ? fields
        : fields.filter((field) => field.value && field.value.trim() !== '')

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <div className='space-y-0 flex flex-row justify-between items-center'>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="hover:bg-transparent gap-1 px-0">
                        <CardTitle className='text-sm font-medium mb-0'>{title}</CardTitle>
                        <ChevronsUpDown className="size-4" />
                        <span className="sr-only">Toggle</span>
                    </Button>
                </CollapsibleTrigger>
            </div>
            <CollapsibleContent className='bg-muted/50 rounded-lg p-3' >
                {displayFields.length > 0 ? (
                    <div className="flex flex-col gap-2 items-end">
                        {displayFields.map((field) => (
                            <div key={field.id} className="w-full">
                                <CustomFieldInput
                                    field={field}
                                    value={editValues[field.id]}
                                    onChange={(value) =>
                                        handleFieldChange(field.id, value)
                                    }
                                    error={errors[field.id]}
                                    disabled={isSaving || !editable}
                                />
                            </div>
                        ))}
                        <Button variant="create" size="xs" className="flex flex-row gap-2" onClick={saveCustomFields}>
                            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                ) : (
                    <Empty variant="border">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <CircleFadingPlusIcon className="size-5" />
                            </EmptyMedia>
                            <EmptyTitle>No custom fields found</EmptyTitle>
                            <EmptyDescription>Custom fields will appear here when they are created</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </CollapsibleContent>
        </Collapsible>
    )
}
