"use client"

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Form,
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  InputTags,
} from "@/components/forms"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"
import { cn } from "@/libs/utils"
import { HelpCircle } from "lucide-react"
import CurrencyInput from "react-currency-input-field"
import { UseFormReturn } from "react-hook-form"

interface PlanOption {
  id: string
  name: string
}

interface PromoFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
  plans: PlanOption[]
}

const durationOptions = [
  { value: "once", label: "One-time use", description: "Discount applies to the first payment only" },
  { value: "repeating", label: "Repeating", description: "Discount applies for a specific number of months" },
  { value: "forever", label: "Forever", description: "Discount applies to all payments indefinitely" },
]

export function PromoForm({ form, plans }: PromoFormProps) {
  const watchType = form.watch("type")
  const watchDuration = form.watch("duration")

  // Map plan names to IDs for form handling
  const planMap = new Map(plans.map(p => [p.name, p.id]))
  const planNames = plans.map(p => p.name)
  
  // Convert IDs (stored in form) to names (displayed in InputTags)
  const getPlanNamesFromIds = (ids: string[] | undefined): string[] => {
    if (!ids) return []
    return ids.map(id => plans.find(p => p.id === id)?.name).filter((name): name is string => !!name)
  }
  
  // Convert names (from InputTags) back to IDs (for form storage)
  const getPlanIdsFromNames = (names: string[]): string[] => {
    return names.map(name => planMap.get(name)).filter((id): id is string => !!id)
  }

  return (
    <Form {...form}>
      <form className="space-y-4 p-4">
        <fieldset>
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel size="tiny">Promo Code</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="e.g., SUMMER2025"
                    className="border-foreground/10"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>

        <fieldset className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel size="tiny">Discount Type</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="border-foreground/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel size="tiny">
                  {watchType === "percentage" ? "Percentage Off" : "Amount Off"}
                </FormLabel>
                <FormControl>
                  {watchType === "percentage" ? (
                    <Input
                      type="number"
                      placeholder="e.g., 20"
                      className="border-foreground/10"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  ) : (
                    <CurrencyInput
                      className={cn(
                        "inline-block w-full h-12 rounded-lg bg-background border border-foreground/10 px-4"
                      )}
                      value={field.value ? field.value / 100 : 0}
                      onValueChange={(value) => {
                        const amount = value ? Math.round(Number(value) * 100) : 0;
                        field.onChange(amount);
                      }}
                      decimalsLimit={2}
                      allowNegativeValue={false}
                      prefix="$"
                    />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>

        <fieldset>
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-1">
                  <FormLabel size="tiny">Duration</FormLabel>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger type="button">
                        <HelpCircle className="size-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-1">
                          {durationOptions.map((opt) => (
                            <p key={opt.value}>
                              <strong>{opt.label}:</strong> {opt.description}
                            </p>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="border-foreground/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {durationOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>

        {watchDuration === "repeating" && (
          <fieldset>
            <FormField
              control={form.control}
              name="durationInMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel size="tiny">Number of Months</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 3"
                      className="border-foreground/10"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val ? Number(val) : undefined);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </fieldset>
        )}

        <fieldset className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="expiresAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel size="tiny">Expiration Date (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    className="border-foreground/10"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxRedemptions"
            render={({ field }) => (
              <FormItem>
                <FormLabel size="tiny">Max Redemptions (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Leave empty for unlimited"
                    className="border-foreground/10"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val ? Number(val) : undefined);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>

        {plans.length > 0 && (
          <fieldset>
            <FormField
              control={form.control}
              name="allowedPlans"
              render={({ field }) => (
                <FormItem>
                  <FormLabel size="tiny">
                    <div className="flex items-center gap-1">
                      Allowed Plans (Optional)
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger type="button">
                            <HelpCircle className="size-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Leave empty to allow this promo on all plans. Select specific plans to restrict usage.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </FormLabel>
                  <FormControl>
                    <InputTags
                      list={planNames}
                      value={getPlanNamesFromIds(field.value)}
                      onChange={(names) => field.onChange(getPlanIdsFromNames(names))}
                      placeholder="Type to search plans..."
                      className="border-foreground/10"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </fieldset>
        )}
      </form>
    </Form>
  )
}