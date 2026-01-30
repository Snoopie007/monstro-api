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
} from "@/components/ui"

import { PromoForm } from "./PromoForm"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "react-toastify"
import { Loader2 } from "lucide-react"
import { VisuallyHidden } from "@react-aria/visually-hidden"

const PromoSchema = z.object({
  code: z.string().min(1).max(50),
  type: z.enum(["percentage", "fixed_amount"]),
  value: z.number().int().positive(),
  duration: z.enum(["once", "repeating", "forever"]),
  durationInMonths: z.number().int().optional(),
  expiresAt: z.string().optional(),
  maxRedemptions: z.number().int().optional(),
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

interface CreatePromoProps {
  lid: string
}

export function CreatePromo({ lid }: CreatePromoProps) {
  const [open, setOpen] = useState(false)
  
  const form = useForm<z.infer<typeof PromoSchema>>({
    resolver: zodResolver(PromoSchema),
    defaultValues: {
      code: "",
      type: "percentage",
      value: 10,
      duration: "once",
    },
    mode: "onChange",
  })

  async function onSubmit(v: z.infer<typeof PromoSchema>) {
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary">+ Promo Code</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[540px] sm:w-[540px] border-foreground/10">
        <VisuallyHidden>
          <DialogTitle>Create Promo Code</DialogTitle>
        </VisuallyHidden>

        <PromoForm form={form} />
        
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
  )
}