"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { useRouter } from "next/navigation"
import type { CreateInvoiceFormData } from "@/libs/FormSchemas/CreateInvoiceSchema"
import { toast } from "sonner"
import type { IStepperMethods } from "@/components/ui"
import { useSession } from "./useSession"
import { clientsideApiClient } from "@/libs/api/client"

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json())

const normalizeItemsForApi = (items: CreateInvoiceFormData["items"]) =>
    items.map((item) => ({
        name: item.name,
        description: item.description || "",
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0),
    }))

const normalizeFormData = (
    data: CreateInvoiceFormData | CreateInvoiceFormData[]
) => (Array.isArray(data) ? data[0] : data)

export const useInvoiceCreation = ({id, mid, ref}: {id: string, mid: string | null, ref: React.RefObject<HTMLDivElement & IStepperMethods> | null}) => {
    const router = useRouter();
    const { data: session } = useSession();
    const api = useMemo(() => {
        if (!session?.user?.sbToken) return null;
        return clientsideApiClient(session.user.sbToken);
    }, [session?.user?.sbToken]);

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
        if (!api || !mid) {
            toast.error('Session not ready')
            return
        }
        const normalizedData = normalizeFormData(data)
        if (!normalizedData) {
            toast.error('Invalid invoice data')
            return
        }
        setIsGeneratingPreview(true)
        try {
            let requestBody: any;

            // Handle from-subscription type
            if (normalizedData.type === 'from-subscription' && normalizedData.selectedSubscriptionId) {
                requestBody = {
                    type: 'from-subscription',
                    selectedSubscriptionId: normalizedData.selectedSubscriptionId,
                };
            } else {
                // Convert prices from dollars to cents for API
                const itemsInCents = normalizeItemsForApi(normalizedData.items).map((item) => ({
                    ...item,
                    price: Math.round(item.price * 100),
                }))
                requestBody = {
                    items: itemsInCents,
                    type: normalizedData.type,
                    collectionMethod: normalizedData.collectionMethod,
                };
            }

            console.log('[InvoiceCreation] Preview payload', {
                locationId: id,
                memberId: mid,
                type: requestBody.type,
                collectionMethod: requestBody.collectionMethod,
                itemCount: Array.isArray(requestBody.items) ? requestBody.items.length : 0,
                selectedSubscriptionId: requestBody.selectedSubscriptionId,
            })

            const result = await api.post(
                `/x/loc/${id}/invoices/preview`,
                {
                    ...requestBody,
                    memberId: mid,
                }
            ) as { preview: unknown }
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
        if (!api || !mid) {
            toast.error('Session not ready')
            return
        }
        const normalizedData = normalizeFormData(data)
        if (!normalizedData) {
            toast.error('Invalid invoice data')
            return
        }
        setIsCreating(true);
        try {
            let requestData = { ...normalizedData };

            // Handle from-subscription type
            if (normalizedData.type === 'from-subscription' && normalizedData.selectedSubscriptionId) {
                // API will handle item population from subscription
                requestData = {
                    type: normalizedData.type,
                    collectionMethod: normalizedData.collectionMethod,
                    paymentType: normalizedData.paymentType,
                    dueDate: normalizedData.dueDate,
                    isRecurring: false,
                    description: normalizedData.description,
                    selectedSubscriptionId: normalizedData.selectedSubscriptionId,
                    items: [],
                };
            } else {
                // Convert prices from dollars to cents for API (for manual entry)
                const itemsInCents = normalizeItemsForApi(normalizedData.items).map((item) => ({
                    ...item,
                    price: Math.round(item.price * 100),
                }));
                requestData = {
                    type: normalizedData.type,
                    collectionMethod: normalizedData.collectionMethod,
                    paymentType: normalizedData.paymentType,
                    dueDate: normalizedData.dueDate,
                    isRecurring: normalizedData.isRecurring,
                    description: normalizedData.description,
                    items: itemsInCents,
                };
            }

            console.log('[InvoiceCreation] Create payload', {
                locationId: id,
                memberId: mid,
                type: requestData.type,
                collectionMethod: requestData.collectionMethod,
                paymentType: requestData.paymentType,
                itemCount: Array.isArray((requestData as any).items) ? (requestData as any).items.length : 0,
                selectedSubscriptionId: (requestData as any).selectedSubscriptionId,
                dueDate: requestData.dueDate,
            })

            const invoice = await api.post(
                `/x/loc/${id}/invoices`,
                {
                    ...requestData,
                    memberId: mid,
                    subscriptionId: requestData.selectedSubscriptionId,
                }
            ) as any;
            console.log('[InvoiceCreation] Create response', {
                hasInvoice: !!invoice,
                invoiceId: invoice?.invoice?.id || invoice?.id,
                status: invoice?.invoice?.status || invoice?.status,
            })
            setCreatedInvoice(invoice);
            toast.success(
                normalizedData.type === 'from-subscription' || normalizedData.paymentType === 'cash'
                    ? 'Invoice created as draft'
                    : 'Invoice created and sent'
            );
            ref?.current?.nextStep?.();
        } catch (error) {
            console.error('[InvoiceCreation] Create failed', {
                error,
                message: error instanceof Error ? error.message : 'Unknown error',
            })
            toast.error(error instanceof Error ? error.message : 'Failed to create invoice');
        } finally {
            setIsCreating(false);
        }
    };

    // Send invoice
    const handleSendInvoice = async () => {
        // For cash payment methods, or if it's a simple invoice object (from-subscription)
        // Just complete and navigate to member page
        if (createdInvoice?.paymentType === 'cash' ||
            createdInvoice?.invoice?.paymentType === 'cash' ||
            !createdInvoice?.invoice?.id) {
            handleComplete();
            return;
        }

        // For Stripe invoices, send them
        setIsSending(true)
        try {
            if (!api) {
                throw new Error('Session not ready')
            }
            const invoiceId = createdInvoice?.invoice?.id || createdInvoice?.id
            const result = await api.post(
                `/x/loc/${id}/invoices/${invoiceId}/send`,
                {}
            ) as { message?: string }
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
