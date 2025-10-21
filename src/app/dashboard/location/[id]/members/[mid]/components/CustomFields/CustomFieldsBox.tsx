'use client'

import React, { useState, useEffect } from 'react'
import {
    CustomFieldInput,
    type CustomFieldDefinition,
} from './CustomFieldInput'
import { CustomFieldDisplay } from './CustomFieldDisplay'
import { Button } from '@/components/ui/button'
import { ChevronsUpDown, FileText } from 'lucide-react'
import { toast } from 'react-toastify'
import { Skeleton, CardTitle, Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../../../../../../components/ui'
import { Item, ItemContent } from '../../../../../../../../components/ui/item'
import { usePermission } from '@/hooks/usePermissions'

interface CustomFieldValue {
    fieldId: string
    value: string
}

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
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [editValues, setEditValues] = useState<Record<string, string>>({})
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [open, setOpen] = useState(false)
    const canEditMember = usePermission('edit member', locationId)

    // Fetch custom fields and values
    const fetchCustomFields = async () => {
        setIsLoading(true)
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
            setIsLoading(false)
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
            <CollapsibleContent className='bg-muted/50 rounded-lg p-4' >
                {displayFields.length > 0 ? (
                    <div className="space-y-2">
                        {displayFields.map((field) => (
                            <div key={field.id}>
                                {editable ? (
                                    <CustomFieldInput
                                        field={field}
                                        value={editValues[field.id]}
                                        onChange={(value) =>
                                            handleFieldChange(field.id, value)
                                        }
                                        error={errors[field.id]}
                                        disabled={isSaving}
                                    />
                                ) : (
                                    <CustomFieldDisplay
                                        field={field}
                                        value={field.value}
                                        variant={'default'}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <div className="flex flex-col items-center justify-center">
                            <FileText
                                size={40}
                                className="text-muted-foreground mb-3"
                            />
                            <p className="text-md mb-1">No custom fields found</p>
                            <p className="text-sm text-muted-foreground">
                                {showEmptyFields
                                    ? "No custom fields are configured for this location"
                                    : "No custom fields have been filled out yet"
                                }
                            </p>
                        </div>
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    )
}
