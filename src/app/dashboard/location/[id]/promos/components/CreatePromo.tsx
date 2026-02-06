"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui"

import { PromoForm } from "./PromoForm"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "react-toastify"
import { Loader2 } from "lucide-react"
import { VisuallyHidden } from "@react-aria/visually-hidden"
import { memberPlans, memberPlanPricing } from "@/db/schemas"

const PromoSchema = z.object({
  code: z.string().min(1).max(50),
  type: z.enum(["percentage", "fixed_amount"]),
  value: z.number().int().positive(),
  duration: z.enum(["once", "repeating", "forever"]),
  durationInMonths: z.number().int().optional(),
  expiresAt: z.string().optional(),
  maxRedemptions: z.number().int().optional(),
  allowedPlans: z.array(z.string()).optional(),
}).refine(
  (data) => {
    if (data.duration === "repeating") {
      return data.durationInMonths !== undefined && data.durationInMonths >= 1
    }
    return true
  },
  {
    message: "Number of months is required when duration is repeating",
    path: ["durationInMonths"],
  }
)

interface PlanWithPricing {
  id: string
  name: string
  pricingOptions: { price: number }[]
}

interface CreatePromoProps {
  lid: string
  plans: PlanWithPricing[]
}

export function CreatePromo({ lid, plans }: CreatePromoProps) {
  const [open, setOpen] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingSubmission, setPendingSubmission] = useState<z.infer<typeof PromoSchema> | null>(null)
  
  const form = useForm<z.infer<typeof PromoSchema>>({
    resolver: zodResolver(PromoSchema),
    defaultValues: {
      code: "",
      type: "percentage",
      value: 10,
      duration: "once",
      allowedPlans: undefined,
    },
    mode: "onChange",
  })

  // Find plans that would become $0 with this fixed amount discount
  const getPlansWithZeroPrice = (value: number, allowedPlanIds: string[] | undefined): string[] => {
    if (!allowedPlanIds || allowedPlanIds.length === 0) return []
    
    const zeroPricePlanNames: string[] = []
    
    for (const planId of allowedPlanIds) {
      const plan = plans.find(p => p.id === planId)
      if (!plan) continue
      
      // Check if any pricing option has price <= discount value
      const hasZeroPriceOption = plan.pricingOptions.some(pricing => pricing.price <= value)
      if (hasZeroPriceOption) {
        zeroPricePlanNames.push(plan.name)
      }
    }
    
    return zeroPricePlanNames
  }

  const handleConfirmSubmit = () => {
    if (pendingSubmission) {
      submitPromo(pendingSubmission)
      setPendingSubmission(null)
    }
    setShowConfirmDialog(false)
  }

  const handleCancelSubmit = () => {
    setPendingSubmission(null)
    setShowConfirmDialog(false)
  }

  async function submitPromo(v: z.infer<typeof PromoSchema>) {
    try {
      const response = await fetch(`/api/locations/${lid}/promos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: v.code,
          type: v.type,
          value: v.value,
          duration: v.duration,
          durationInMonths: v.duration === "repeating" ? v.durationInMonths : undefined,
          expiresAt: v.expiresAt || undefined,
          maxRedemptions: v.maxRedemptions || undefined,
          allowedPlans: v.allowedPlans && v.allowedPlans.length > 0 ? v.allowedPlans : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || "Failed to create promo")
        return
      }

      toast.success("Promo code created successfully")
      form.reset()
      setOpen(false)
      window.location.reload()
    } catch (error) {
      toast.error("Something went wrong, please try again later")
    }
  }

  async function onSubmit(v: z.infer<typeof PromoSchema>) {
    // Check if we need to show confirmation dialog for fixed_amount promos
    if (v.type === "fixed_amount" && v.allowedPlans && v.allowedPlans.length > 0) {
      const zeroPricePlans = getPlansWithZeroPrice(v.value, v.allowedPlans)
      
      if (zeroPricePlans.length > 0) {
        setPendingSubmission(v)
        setShowConfirmDialog(true)
        return
      }
    }
    
    // No confirmation needed, submit directly
    await submitPromo(v)
  }

  // Get the names of plans that would have $0 price for the confirmation dialog
  const zeroPricePlanNames = pendingSubmission 
    ? getPlansWithZeroPrice(pendingSubmission.value, pendingSubmission.allowedPlans)
    : []

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="primary">+ Promo Code</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[540px] sm:w-[540px] border-foreground/10">
          <VisuallyHidden>
            <DialogTitle>Create Promo Code</DialogTitle>
          </VisuallyHidden>

          <PromoForm form={form} plans={plans.map(p => ({ id: p.id, name: p.name }))} />
          
          <DialogFooter className="p-4 flex flex-row sm:justify-between">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="foreground"
              disabled={form.formState.isSubmitting}
              onClick={() => form.handleSubmit(onSubmit)()}
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for $0 price warning */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="border-foreground/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Promo May Result in $0 Price</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This fixed amount promo (${((pendingSubmission?.value || 0) / 100).toFixed(2)}) is larger than or equal to the price of some selected plans.
              </p>
              <p>
                The following plans will have a <strong>$0 price</strong> when this promo is applied:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                {zeroPricePlanNames.map((name) => (
                  <li key={name} className="text-foreground font-medium">{name}</li>
                ))}
              </ul>
              <p>Do you want to continue creating this promo?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSubmit}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
