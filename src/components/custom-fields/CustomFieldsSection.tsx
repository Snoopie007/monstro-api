'use client'

import React, { useState, useEffect } from 'react'
import {
    CustomFieldInput,
    type CustomFieldDefinition,
} from './CustomFieldInput'
import { CustomFieldDisplay } from './CustomFieldDisplay'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Edit3, Save, X, Loader2, PlusIcon, SettingsIcon } from 'lucide-react'
import { toast } from 'react-toastify'
import { Skeleton } from '../ui'
import { Item, ItemContent } from '../ui/item'
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

export function CustomFieldsSection({
    memberId,
    locationId,
    editable = false,
    title = 'Custom Fields',
    showEmptyFields = false,
}: CustomFieldsSectionProps) {
    const [fields, setFields] = useState<CustomFieldsWithValues[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [editValues, setEditValues] = useState<Record<string, string>>({})
    const [errors, setErrors] = useState<Record<string, string>>({})
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
                // Initialize edit values
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
                setIsEditing(false)
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

    // Cancel editing
    const cancelEditing = () => {
        setIsEditing(false)
        setErrors({})
        // Reset edit values to current field values
        const resetValues: Record<string, string> = {}
        fields.forEach((field) => {
            resetValues[field.id] = field.value || ''
        })
        setEditValues(resetValues)
    }

    useEffect(() => {
        fetchCustomFields()
    }, [memberId, locationId])

    // Filter fields based on showEmptyFields setting
    const displayFields = showEmptyFields
        ? fields
        : fields.filter((field) => field.value && field.value.trim() !== '')

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-4 gap-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
            </div>
        )
    }

    if (displayFields.length === 0 && !isEditing) {
        if (showEmptyFields) {
            return (
                <div className="text-center p-4">
                    <p className="text-sm text-muted-foreground">
                        No custom fields configured
                    </p>
                </div>
            )
        }
        return null // Don't show anything if no fields with values
    }

    const renderEditButton = () => {
        if (editable && canEditMember) {
            return (
                <Button
                    onClick={() => setIsEditing(true)}
                    variant={'ghost'}
                    size={'icon'}
                    className="size-6 rounded-sm"
                >
                    {isSaving ? null : <SettingsIcon className="size-4" />}
                </Button>
            )
        }
        return null
    }

    return (
        <div className="flex flex-col gap-2 px-4 mb-4">
            <div className="flex flex-row gap-2">
                <h2 className="text-md font-medium">{title}</h2>
                {renderEditButton()}
            </div>
            <Item variant="muted">
                <ItemContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(isEditing ? fields : displayFields).map((field) => (
                            <div key={field.id}>
                                {isEditing ? (
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
                    {editable && (
                        <div className="flex items-center gap-2 mt-2 justify-end">
                            {isEditing && (
                                <>
                                    <Button
                                        onClick={saveCustomFields}
                                        variant="default"
                                        disabled={isSaving}
                                        size="xs"
                                        className="text-xs"
                                    >
                                        {isSaving ? (
                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        ) : (
                                            <Save className="h-3 w-3 mr-1" />
                                        )}
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </Button>
                                    <Button
                                        onClick={cancelEditing}
                                        variant="outline"
                                        size="xs"
                                        disabled={isSaving}
                                        className="text-xs"
                                    >
                                        <X className="h-3 w-3 mr-1" />
                                        Cancel
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </ItemContent>
            </Item>
        </div>
    )
}
