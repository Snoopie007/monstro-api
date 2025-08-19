"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui";
import {
  CreateInvoiceSchema,
  CreateInvoiceFormData,
  defaultInvoiceFormValues,
} from "@/libs/FormSchemas/CreateInvoiceSchema";
import { ChevronRight, ChevronLeft, ArrowLeft } from "lucide-react";
import { InvoiceDetailsStep } from "../../components/MemberInvoices/InvoiceDetailsStep";
import { InvoiceItemsStep } from "../../components/MemberInvoices/InvoiceItemsStep";
import { InvoicePreviewStep } from "../../components/MemberInvoices/InvoicePreviewStep";
import { InvoiceConfirmStep } from "../../components/MemberInvoices/InvoiceConfirmStep";
import { toast } from "react-toastify";

type StepType = "details" | "items" | "preview" | "confirm";

interface CreateInvoicePageProps {
  params: Promise<{
    id: string;
    mid: string;
  }>;
}

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CreateInvoicePage({ params }: CreateInvoicePageProps) {
  // Unwrap the params promise using React.use()
  const resolvedParams = React.use(params);

  const router = useRouter();
  const [step, setStep] = useState<StepType>("details");
  const [previewData, setPreviewData] = useState<any>(null);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Fetch member data
  const { data: member, error: memberError } = useSWR(
    `/api/protected/loc/${resolvedParams.id}/members/${resolvedParams.mid}`,
    fetcher
  );

  const form = useForm<CreateInvoiceFormData>({
    resolver: zodResolver(CreateInvoiceSchema),
    defaultValues: defaultInvoiceFormValues as CreateInvoiceFormData,
  });

  const watchedType = form.watch("type");

  // Get member name
  const memberName = member
    ? `${member.firstName} ${member.lastName}`
    : "Member";

  // Navigate back to invoices list
  const handleGoBack = () => {
    router.back();
  };

  // Navigate to invoices list after completion
  const handleComplete = () => {
    router.push(
      `/dashboard/location/${resolvedParams.id}/members/${resolvedParams.mid}?tab=invoices`
    );
  };

  // Generate invoice preview
  const handlePreview = async (data: CreateInvoiceFormData) => {
    setIsGeneratingPreview(true);
    try {
      // Convert prices from dollars to cents for API
      const itemsInCents = data.items.map((item) => ({
        ...item,
        price: Math.round(item.price * 100),
      }));

      const response = await fetch(
        `/api/protected/loc/${resolvedParams.id}/members/${resolvedParams.mid}/invoices/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: itemsInCents }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate preview");
      }

      const result = await response.json();
      setPreviewData(result.preview);
      setStep("preview");
    } catch (error) {
      console.error("Preview error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate preview"
      );
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Create invoice
  const handleCreateInvoice = async (data: CreateInvoiceFormData) => {
    setIsCreating(true);
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
              startDate: data.recurringSettings.startDate.toISOString(),
              endDate: data.recurringSettings.endDate?.toISOString(),
            }
          : undefined,
      };

      const response = await fetch(
        `/api/protected/loc/${resolvedParams.id}/members/${resolvedParams.mid}/invoices`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiData),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create invoice");
      }

      const result = await response.json();
      setCreatedInvoice(result);
      setStep("confirm");
      toast.success("Invoice created successfully!");
    } catch (error) {
      console.error("Create invoice error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create invoice"
      );
    } finally {
      setIsCreating(false);
    }
  };

  // Send invoice
  const handleSendInvoice = async () => {
    if (!createdInvoice?.invoice?.id) return;

    setIsSending(true);
    try {
      const response = await fetch(
        `/api/protected/loc/${resolvedParams.id}/members/${resolvedParams.mid}/invoices/${createdInvoice.invoice.id}/send`,
        { method: "POST" }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send invoice");
      }

      const result = await response.json();
      toast.success(result.message || "Invoice sent successfully!");
      handleComplete();
    } catch (error) {
      console.error("Send invoice error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send invoice"
      );
    } finally {
      setIsSending(false);
    }
  };

  const stepConfig = [
    { key: "details", label: "Details", number: 1 },
    { key: "items", label: "Items", number: 2 },
    { key: "preview", label: "Preview", number: 3 },
    { key: "confirm", label: "Confirm", number: 4 },
  ];

  const currentStepIndex = stepConfig.findIndex((s) => s.key === step);

  const goToStep = (newStep: StepType) => {
    setStep(newStep);
  };

  // Show loading state while fetching member data
  if (!member && !memberError) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Show error state if member fetch failed
  if (memberError) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
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
            <Button onClick={() => window.location.reload()} variant="default">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check if member has Stripe customer ID for invoice creation
  const hasStripeCustomer = member?.stripeCustomerId;
  if (member && !hasStripeCustomer) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-yellow-600 mb-2">
            Setup Required
          </h2>
          <p className="text-gray-600 mb-4">
            This member needs to be set up with billing information before
            invoices can be created.
          </p>
          <div className="space-x-2">
            <Button onClick={handleGoBack} variant="outline">
              Go Back
            </Button>
            <Button
              onClick={() =>
                router.push(
                  `/dashboard/location/${resolvedParams.id}/members/${resolvedParams.mid}/billing`
                )
              }
              variant="default"
            >
              Setup Billing
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
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

      <Card className="border-foreground/10 bg-foreground/10 rounded-md">
        <CardHeader>
          {/* Step Indicator */}
          <div className="flex items-center justify-start space-x-2 overflow-x-auto pb-2">
            {stepConfig.map((stepItem, index) => (
              <div
                key={stepItem.key}
                className="flex items-center flex-shrink-0"
              >
                <div
                  className={`flex items-center ${
                    step === stepItem.key
                      ? "text-indigo-500"
                      : currentStepIndex > index
                      ? "text-green-600"
                      : "text-gray-400"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === stepItem.key
                        ? "bg-indigo-500 text-white"
                        : currentStepIndex > index
                        ? "bg-green-600 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    {stepItem.number}
                  </div>
                  <span className="ml-2 text-sm font-medium hidden sm:block">
                    {stepItem.label}
                  </span>
                </div>
                {index < stepConfig.length - 1 && (
                  <ChevronRight className="w-4 h-4 mx-2 text-gray-400 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {/* Step Content */}
          <div className="min-h-[400px]">
            {step === "details" && (
              <InvoiceDetailsStep
                form={form}
                onNext={() => goToStep("items")}
              />
            )}

            {step === "items" && (
              <InvoiceItemsStep
                form={form}
                onNext={() => {
                  // Trigger preview generation when moving to preview step
                  const formData = form.getValues();
                  handlePreview(formData);
                }}
                onBack={() => goToStep("details")}
                isLoading={isGeneratingPreview}
              />
            )}

            {step === "preview" && (
              <InvoicePreviewStep
                form={form}
                previewData={previewData}
                onPreview={handlePreview}
                onCreate={handleCreateInvoice}
                onBack={() => goToStep("items")}
                isCreating={isCreating}
                isGeneratingPreview={isGeneratingPreview}
                memberName={memberName}
              />
            )}

            {step === "confirm" && (
              <InvoiceConfirmStep
                invoice={createdInvoice}
                onSend={handleSendInvoice}
                isSending={isSending}
                onClose={handleComplete}
                memberName={memberName}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
