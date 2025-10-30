"use client"

import { useState } from "react"
import useSWR from "swr"
import { useRouter } from "next/navigation"
import type { CreateInvoiceFormData } from "@/libs/FormSchemas/CreateInvoiceSchema"
import { toast } from "sonner"
import type { IStepperMethods } from "@/components/ui"

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
            let requestBody: any;

            // Handle from-subscription type
            if (data.type === 'from-subscription' && data.selectedSubscriptionId) {
                requestBody = {
                    type: 'from-subscription',
                    selectedSubscriptionId: data.selectedSubscriptionId,
                };
            } else {
                // Convert prices from dollars to cents for API
                const itemsInCents = data.items.map((item) => ({
                    ...item,
                    price: Math.round(item.price * 100),
                }))
                requestBody = { items: itemsInCents };
            }

            const response = await fetch(
                `/api/protected/loc/${id}/members/${mid}/invoices/preview`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
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

    const handleCreateInvoice = async (data: CreateInvoiceFormData) => {
        setIsCreating(true);
        try {
            let requestData = { ...data };

            // Handle from-subscription type
            if (data.type === 'from-subscription' && data.selectedSubscriptionId) {
                // API will handle item population from subscription
                requestData = {
                    ...data,
                    // Items will be populated by API, but we still pass them for validation
                    items: data.items,
                };
            } else {
                // Convert prices from dollars to cents for API (for manual entry)
                const itemsInCents = data.items.map((item) => ({
                    ...item,
                    price: Math.round(item.price * 100),
                }));
                requestData = {
                    ...data,
                    items: itemsInCents,
                };
            }

            const response = await fetch(
                `/api/protected/loc/${id}/members/${mid}/invoices/create`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData),
                }
            );
    
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create invoice');
            }
    
            const invoice = await response.json();
            setCreatedInvoice(invoice);
            toast.success(
                data.type === 'from-subscription' || data.paymentMethod === 'manual'
                    ? 'Invoice created as draft'
                    : 'Invoice created and sent'
            );
            ref?.current?.nextStep?.();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to create invoice');
        } finally {
            setIsCreating(false);
        }
    };

    // Send invoice
    const handleSendInvoice = async () => {
        // For manual or cash payment methods, or if it's a simple invoice object (from-subscription)
        // Just complete and navigate to member page
        if (createdInvoice?.paymentMethod === 'manual' || 
            createdInvoice?.paymentMethod === 'cash' ||
            !createdInvoice?.invoice?.id) {
            handleComplete();
            return;
        }

        // For Stripe invoices, send them
        setIsSending(true)
        try {
            const response = await fetch(
                `/api/protected/loc/${id}/members/${mid}/invoices/${createdInvoice.invoice.id}/send`,
                { method: 'PATCH' }
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