'use client'

import {
    Button,
    InteractiveStepper,
    InteractiveStepperItem,
    InteractiveStepperSeparator,
    InteractiveStepperTrigger,
    IStepperMethods,
    InteractiveStepperIndicator,
    InteractiveStepperTitle,
    InteractiveStepperContent,
} from '@/components/ui'
import {
    type CreateInvoiceFormData,
    CreateInvoiceSchema,
    defaultInvoiceFormValues,
} from '@/libs/FormSchemas/CreateInvoiceSchema'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
    InvoiceDetailsStep,
    InvoiceItemsStep,
    InvoicePreviewStep,
    InvoiceConfirmStep,
} from '../components'
import { useInvoiceCreation } from '@/hooks/useInvoiceCreation'

interface CreateInvoicePageProps {
    params: Promise<{
        id: string
    }>
}

export default function CreateInvoicePage({ params }: CreateInvoicePageProps) {
    const stepperRef = useRef<HTMLDivElement & IStepperMethods>(null)

    // Unwrap the params promise using React.use()
    const resolvedParams = React.use(params)
    const searchParams = useSearchParams()

    // TODO: handle null when initial fetch happens (404 and 500 responses; add a member selector to the page if mid search param is null)
    const memberId = searchParams.get('mid')

    const {
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
    } = useInvoiceCreation({ id: resolvedParams.id, mid: memberId, ref: stepperRef as React.RefObject<HTMLDivElement & IStepperMethods> });

    const form = useForm<CreateInvoiceFormData>({
        resolver: zodResolver(CreateInvoiceSchema),
        defaultValues: defaultInvoiceFormValues as CreateInvoiceFormData,
    })

    // Show loading state while fetching member data
    if (isLoadingMember) {
        return (
            <div className="container mx-auto p-6 max-w-4xl">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        )
    }

    // Show error state if member fetch failed
    if (memberError) {
        return (
            <div className="container mx-auto p-6 max-w-4xl">
                <div className="text-center py-12">
                    <h2 className="text-xl font-semibold text-red-600 mb-2">
                        Error Loading Member
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Failed to load member information. Please try again.
                    </p>
                    <div className="space-x-2">
                        <Button onClick={handleGoBack} variant="outline">
                            Go Back
                        </Button>
                        <Button
                            onClick={() => window.location.reload()}
                            variant="default"
                        >
                            Retry
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // Check if member has Stripe customer ID for invoice creation
    const hasStripeCustomer = member?.stripeCustomerId;
    return (
        <div className="flex flex-col container mx-auto p-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleGoBack}
                        className="p-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-md">Back</span>
                </div>
            </div>

            <InteractiveStepper ref={stepperRef}>
                <InteractiveStepperItem key={1}>
                    <InteractiveStepperIndicator />
                    <div>
                        <InteractiveStepperTitle>
                            Details
                        </InteractiveStepperTitle>
                    </div>
                    <InteractiveStepperSeparator />
                </InteractiveStepperItem>

                <InteractiveStepperItem key={2}>
                    <InteractiveStepperIndicator />
                    <div>
                        <InteractiveStepperTitle>Items</InteractiveStepperTitle>
                    </div>
                </InteractiveStepperItem>

                <InteractiveStepperItem key={3}>
                    <InteractiveStepperIndicator />
                    <div>
                        <InteractiveStepperTitle>
                            Preview Invoice
                        </InteractiveStepperTitle>
                    </div>
                </InteractiveStepperItem>

                <InteractiveStepperItem key={4}>
                    <InteractiveStepperTrigger>
                        <InteractiveStepperIndicator />
                        <div>
                            <InteractiveStepperTitle>
                                Confirm Invoice
                            </InteractiveStepperTitle>
                        </div>
                    </InteractiveStepperTrigger>
                </InteractiveStepperItem>

                <InteractiveStepperContent step={1}>
                    <InvoiceDetailsStep
                        form={form}
                        hasStripeCustomer={hasStripeCustomer}
                        locationId={resolvedParams.id}
                        memberId={memberId}
                        onNext={() => stepperRef.current?.nextStep()}
                    />
                </InteractiveStepperContent>

                <InteractiveStepperContent step={2}>
                    <InvoiceItemsStep
                        form={form}
                        locationId={resolvedParams.id}
                        memberId={memberId}
                        onNext={() => {
                            // Trigger preview generation when moving to preview step
                            const formData = form.getValues()
                            handlePreview(formData)
                        }}
                        onBack={() => stepperRef.current?.goToStep(1)}
                        isLoading={isGeneratingPreview}
                    />
                </InteractiveStepperContent>

                <InteractiveStepperContent step={3}>
                    <InvoicePreviewStep
                        form={form}
                        previewData={previewData}
                        onPreview={handlePreview}
                        onCreate={handleCreateInvoice}
                        onBack={() => stepperRef.current?.prevStep()}
                        isCreating={isCreating}
                        isGeneratingPreview={isGeneratingPreview}
                        memberName={memberName}
                    />
                </InteractiveStepperContent>

                <InteractiveStepperContent step={4}>
                    <InvoiceConfirmStep
                        invoice={createdInvoice}
                        onSend={handleSendInvoice}
                        isSending={isSending}
                        onClose={handleComplete}
                        memberName={memberName}
                    />
                </InteractiveStepperContent>
            </InteractiveStepper>
        </div>
    )
}
