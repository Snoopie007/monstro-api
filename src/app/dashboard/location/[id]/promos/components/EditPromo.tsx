"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  Button,
} from "@/components/ui"
import type { Promo } from "@/db/schemas"
import { useState } from "react"
import { toast } from "react-toastify"
import { Loader2 } from "lucide-react"
import { VisuallyHidden } from "@react-aria/visually-hidden"

interface EditPromoProps {
  promo: Promo
  lid: string
  onClose: () => void
}

export function EditPromo({ promo, lid, onClose }: EditPromoProps) {
  const [isActive, setIsActive] = useState(promo.isActive)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    
    try {
      const response = await fetch(`/api/locations/${lid}/promos/${promo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      })

      if (response.ok) {
        toast.success("Promo updated successfully")
        onClose()
        window.location.reload()
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to update promo")
      }
    } catch (error) {
      toast.error("Failed to update promo")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[540px] sm:w-[540px] border-foreground/10">
        <VisuallyHidden>
          <DialogTitle>Edit Promo Code</DialogTitle>
        </VisuallyHidden>

        <div className="p-4 space-y-4">
          <div className="p-4 bg-foreground/5 rounded-lg">
            <p className="font-mono font-semibold text-lg">{promo.code}</p>
            <p className="text-sm text-muted-foreground">
              {promo.type === "percentage" 
                ? `${promo.value}% off` 
                : `$${(promo.value / 100).toFixed(2)} off`}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="promo-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5 rounded border-foreground/20"
            />
            <label htmlFor="promo-active" className="text-sm font-medium">
              Active (members can use this code)
            </label>
          </div>
        </div>

        <DialogFooter className="p-4 flex flex-row sm:justify-between">
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="foreground"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}