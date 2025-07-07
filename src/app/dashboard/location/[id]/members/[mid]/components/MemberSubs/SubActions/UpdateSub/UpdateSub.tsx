"use client";
import { Button, DialogFooter, DialogClose, Switch } from "@/components/ui";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
  Input,
} from "@/components/forms";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn, tryCatch } from "@/libs/utils";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useParams } from "next/navigation";
import { format, intervalToDuration } from "date-fns";
import { MemberSubscription } from "@/types";
import { EndDayPicker, PaymentMethodPicker } from ".";

const UpdateSubSchema = z.object({
  paymentType: z.enum([
    "card",
    "cash",
    "check",
    "zelle",
    "venmo",
    "paypal",
    "apple",
    "google",
  ]),
  endAt: z.date().optional(),
  paymentMethodId: z.string().optional(),
  trialDays: z.number().min(0, "Trial days must be non-negative").optional(),
  allowProration: z.boolean().default(false),
  reset: z.boolean().default(false),
});

interface UpdateSubProps {
  sub: MemberSubscription;
  show: boolean;
  close: () => void;
}

export function UpdateSub({ sub, show, close }: UpdateSubProps) {
  const [mutableSub, setMutableSub] = useState<MemberSubscription>(sub);
  const [loading, setLoading] = useState(false);
  const params = useParams();

  const form = useForm<z.infer<typeof UpdateSubSchema>>({
    resolver: zodResolver(UpdateSubSchema),
    defaultValues: {
      paymentType: sub.paymentMethod,
      endAt: sub.cancelAt || undefined,
      trialDays: 0,
      allowProration: sub.plan?.allowProration,
      paymentMethodId:
        (sub.metadata as { paymentMethodId?: string })?.paymentMethodId ||
        undefined,
      reset: false,
    },
  });

  useEffect(() => {
    if (sub.status === "trialing" && sub.trialEnd) {
      const trialDays = intervalToDuration({
        start: new Date(),
        end: new Date(sub.trialEnd),
      });
      form.setValue("trialDays", trialDays.days || 0, { shouldValidate: true });
    }
  }, [sub]);

  const paymentType = form.watch("paymentType");

  // Debug: Log form state for troubleshooting
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("Form validation state:", {
        isValid: form.formState.isValid,
        errors: form.formState.errors,
        values: form.getValues(),
      });
    }
  }, [form.formState.isValid, form.formState.errors]);

  async function onSubmit(v: z.infer<typeof UpdateSubSchema>) {
    if (!sub.id || !params?.id || !params?.mid) {
      toast.error("Missing required information");
      return;
    }

    setLoading(true);

    const { result, error } = await tryCatch(
      fetch(
        `/api/protected/loc/${params.id}/members/${params.mid}/subscriptions`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(v),
        }
      )
    );

    setLoading(false);

    if (error || !result || !result.ok) {
      toast.error("Failed to update subscription");
      return;
    }

    toast.success("Subscription updated successfully");
    close();
  }

  return (
    <div className={cn(show ? "block" : "hidden")}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4">
          <SubInfo sub={mutableSub} />
          <fieldset className="space-y-4">
            <FormLabel size={"tiny"}>Duration</FormLabel>
            <div className="flex flex-row gap-2 items-center">
              <span className="text-xs font-medium">
                {format(new Date(sub.currentPeriodStart), "MMM d, yyyy")}
              </span>
              <ArrowRight className="size-3.5 " />
              <FormField
                control={form.control}
                name="endAt"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <EndDayPicker
                        onChange={field.onChange}
                        startDate={sub.currentPeriodStart}
                        endDate={field.value || sub.cancelAt}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </fieldset>

          {paymentType === "card" && (
            <fieldset
              className={cn(
                sub.status === "trialing" && "grid grid-cols-2 gap-2"
              )}
            >
              <FormField
                control={form.control}
                name="paymentMethodId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel size={"tiny"}>Payment Method</FormLabel>
                    <FormControl>
                      <PaymentMethodPicker
                        method={sub.metadata}
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              {sub.status === "trialing" && (
                <FormField
                  control={form.control}
                  name="trialDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel size={"tiny"}>Add Trial Days</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="rounded-sm"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </fieldset>
          )}

          <fieldset>
            <FormField
              control={form.control}
              name="reset"
              render={({ field }) => (
                <FormItem className="flex flex-row bg-foreground/5 items-center gap-3 rounded-sm border border-foreground/10 py-2 px-3 ">
                  <FormControl>
                    <Switch
                      className="-mt-1"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">
                      Reset billing cycle
                    </FormLabel>
                    <FormDescription className="text-xs">
                      Will immediately restart the billing cycle as of today and
                      charge again.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </fieldset>
          {paymentType === "card" && (
            <fieldset>
              <FormField
                control={form.control}
                name="allowProration"
                render={({ field }) => (
                  <FormItem className="flex flex-row bg-foreground/5 items-center gap-3 rounded-sm border border-foreground/10 py-2 px-3 ">
                    <FormControl>
                      <Switch
                        className="-mt-1"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">
                        Proration Changes
                      </FormLabel>
                      <FormDescription className="text-xs">
                        Enable proration for plan changes.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </fieldset>
          )}
        </form>
      </Form>
      <DialogFooter className="flex flex-row gap-2 sm:justify-between">
        <DialogClose asChild>
          <Button variant="outline" size="sm" disabled={loading}>
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="submit"
          variant="foreground"
          size="sm"
          disabled={loading || !form.formState.isValid}
          onClick={form.handleSubmit(onSubmit)}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Update Subscription
        </Button>
      </DialogFooter>
    </div>
  );
}

function SubInfo({ sub }: { sub: MemberSubscription }) {
  return (
    <div className="text-sm p-4 bg-foreground/5 rounded-sm grid grid-cols-2 gap-4">
      <div className="flex flex-col">
        <span className="font-medium">Plan:</span>
        <span className="text-foreground/50 text-xs capitalize">
          {" "}
          {sub.plan?.name}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="font-medium">Duration:</span>
        <span className="text-foreground/50 text-xs capitalize">
          {format(new Date(sub.currentPeriodStart), "MMM d, yyyy")} {" - "}
          {sub.cancelAt
            ? format(new Date(sub.cancelAt), "MMM d, yyyy")
            : "Forever"}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="font-medium">Payment Type:</span>
        <span className="text-foreground/50 text-xs capitalize">
          {" "}
          {sub.paymentMethod}
          <span className="text-red-500 lowercase"> (Cannot be changed)</span>
        </span>
      </div>
      <div className="flex flex-col ">
        <span className="font-medium">Next billing date:</span>
        <span className="text-foreground/50 text-xs">
          {" "}
          {format(new Date(sub.currentPeriodEnd), "MMM d, yyyy")}
        </span>
      </div>
    </div>
  );
}
