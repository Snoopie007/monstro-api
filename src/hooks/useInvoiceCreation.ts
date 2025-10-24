"use client"

import { useState } from "react"
import useSWR from "swr"
import { useRouter } from "next/navigation"
import { CreateInvoiceFormData } from "@/libs/FormSchemas/CreateInvoiceSchema"
import { toast } from "sonner"
import { IStepperMethods } from "@/components/ui"

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json())

export const useInvoiceCreation = ({id, mid, ref}: {id: string, mid: string | null, ref: React.RefObject<HTMLDivElement & IStepperMethods> | null}) => {
    const router = useRouter();

    const [previewData, setPreviewData] = useState<any>(null)
    const [createdInvoice, setCreatedInvoice] = useState<any>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)

    // Fetch member data
    const {
        data: member,
        isLoading: isLoadingMember,
        error: memberError,
    } = useSWR(
        `/api/protected/loc/${id}/members/${mid}`,
        fetcher,
    )

    // Get member name
    const memberName = member
        ? `${member.firstName} ${member.lastName}`
        : 'Member'


        // Navigate back to invoices list
    const handleGoBack = () => {
        router.back()
    }

    // Navigate to invoices list after completion
    const handleComplete = () => {
        router.push(
            `/dashboard/location/${id}/members/${mid}?tab=invoices`
        )
    }

    // Generate invoice preview
    const handlePreview = async (data: CreateInvoiceFormData) => {
        setIsGeneratingPreview(true)
        try {
            // Convert prices from dollars to cents for API
            const itemsInCents = data.items.map((item) => ({
                ...item,
                price: Math.round(item.price * 100),
            }))

            const response = await fetch(
                `/api/protected/loc/${id}/members/${mid}/invoices/preview`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: itemsInCents }),
                }
            )

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to generate preview')
            }

            const result = await response.json()
            setPreviewData(result.preview)
            ref?.current?.goToStep(3)
        } catch (error) {
            console.error('Preview error:', error)
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to generate preview'
            )
        } finally {
            setIsGeneratingPreview(false)
        }
    }

    // Create invoice
    const handleCreateInvoice = async (data: CreateInvoiceFormData) => {
        setIsCreating(true)
        try {
            // Convert form data for API
            const apiData = {
                ...data,
                items: data.items.map((item) => ({
                    ...item,
                    price: Math.round(item.price * 100), // Convert to cents
                })),
                dueDate: data.dueDate?.toISOString(),
                recurringSettings: data.recurringSettings
                    ? {
                          ...data.recurringSettings,
                          startDate:
                              data.recurringSettings.startDate.toISOString(),
                          endDate:
                              data.recurringSettings.endDate?.toISOString(),
                      }
                    : undefined,
            }

            const response = await fetch(
                `/api/protected/loc/${id}/members/${mid}/invoices`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(apiData),
                }
            )

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to create invoice')
            }

            const result = await response.json()
            setCreatedInvoice(result)
            ref?.current?.goToStep(4)
            // setStep('confirm')
            toast.success('Invoice created successfully!')
        } catch (error) {
            console.error('Create invoice error:', error)
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to create invoice'
            )
        } finally {
            setIsCreating(false)
        }
    }

    // Send invoice
    const handleSendInvoice = async () => {
        if (!createdInvoice?.invoice?.id) return

        setIsSending(true)
        try {
            const response = await fetch(
                `/api/protected/loc/${id}/members/${mid}/invoices/${createdInvoice.invoice.id}/send`,
                { method: 'POST' }
            )

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to send invoice')
            }

            const result = await response.json()
            toast.success(result.message || 'Invoice sent successfully!')
            handleComplete()
        } catch (error) {
            console.error('Send invoice error:', error)
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to send invoice'
            )
        } finally {
            setIsSending(false)
        }
    }

    return {
        isLoadingMember,
        memberError,
        handleGoBack,
        handleComplete,
        handleCreateInvoice,
        handleSendInvoice,
        handlePreview,
        previewData,
        createdInvoice,
        isCreating,
        isSending,
        isGeneratingPreview,
        member,
        memberName,
        router
    }
}