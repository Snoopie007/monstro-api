import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogBody,
  CollapsibleContent,
  Collapsible,
  CollapsibleTrigger,
  Switch,
} from "@/components/ui";
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
import { Member } from "@/types";

import { DialogDescription, DialogTrigger } from "@radix-ui/react-dialog";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { ChevronRight, Loader2, PlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { cn, StripeCardOptions } from "@/libs/utils";
import { useTheme } from "next-themes";
import { AddCreditCardSchema } from "@/libs/FormSchemas/schemas";
import { RegionSelect } from "@/components/forms";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { useMemberPaymentMethods } from "../../providers/MemberContext";
import { VisuallyHidden } from "react-aria";

interface AddPaymentMethodProps {
  member: Member;
  locationId: string;
}

export default function AddPaymentMethod({
  member,
  locationId,
}: AddPaymentMethodProps) {
  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [validCard, setValidCard] = useState(false);
  const { addPaymentMethods } = useMemberPaymentMethods();
  const { theme } = useTheme();
  const stripe = useStripe();
  const elements = useElements();

  const form = useForm<z.infer<typeof AddCreditCardSchema>>({
    resolver: zodResolver(AddCreditCardSchema),
    defaultValues: {
      name: "",
      default: false,
      address: {
        line1: "",
        line2: "",
        city: "",
        state: "",
        country: "US",
        postal_code: "",
      },
    },
    mode: "onChange",
  });

  async function onSubmit(v: z.infer<typeof AddCreditCardSchema>) {
    if (!elements || !stripe || !validCard) return;
    setLoading(true);

    const cardElement = elements.getElement(CardElement);

    try {
      const tokenRef = await stripe.createToken(cardElement!, { ...v });

      if (tokenRef.token) {
        const res = await fetch(
          `/api/protected/loc/${locationId}/members/${member.id}/payments`,
          {
            method: "POST",
            body: JSON.stringify({
              token: tokenRef.token.id,
              ...v,
              member: {
                email: member.email,
                firstName: member.firstName,
                lastName: member.lastName,
                phone: member.phone,
              },
            }),
          }
        );
        setLoading(false);
        if (res.ok) {
          const data = await res.json();
          addPaymentMethods(data);
          toast.success("Card added successfully", { theme: "dark" });
        }
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to add card", { theme: "dark" });
    } finally {
      setOpen(false);
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={"ghost"} size={"icon"} className="size-6 rounded-sm">
          <PlusIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px] rounded-sm border-foreground/10">
        <VisuallyHidden>
          <DialogTitle></DialogTitle>
        </VisuallyHidden>
        <DialogBody>
          <Form {...form}>
            <form className=" space-y-3">
              <fieldset>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel size="tiny">Cardholder Name</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Name on card"
                          className="border-none rounded-sm  px-3 py-2 w-full"
                          {...field}
                          value={
                            field.value.charAt(0).toUpperCase() +
                            field.value.slice(1)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </fieldset>

              <fieldset>
                <FormField
                  control={form.control}
                  name="address.line1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel size="tiny">Billing Address</FormLabel>

                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Billing Address"
                          className=" border-none rounded-sm  p-3 w-full"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </fieldset>
              <fieldset className="grid grid-cols-3 items-center gap-2">
                <FormField
                  control={form.control}
                  name="address.city"
                  render={({ field }) => (
                    <FormItem className="col-span-1">
                      <FormControl>
                        <Input
                          type="text"
                          className="border-none  rounded-sm"
                          placeholder="City"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.state"
                  render={({ field }) => (
                    <FormItem className="col-span-1">
                      <FormControl>
                        <RegionSelect
                          value={field.value}
                          onChange={(value) => field.onChange(value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.postal_code"
                  render={({ field }) => (
                    <FormItem className="col-span-1">
                      <FormControl>
                        <Input
                          type="text"
                          className="border-none rounded-sm"
                          placeholder="Zipcode"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </fieldset>
              <fieldset>
                <FormItem className="flex-1">
                  <FormLabel size="tiny">Card Info</FormLabel>
                  <CardElement
                    className=" bg-background  rounded-sm  p-3 w-full"
                    options={{
                      ...StripeCardOptions,
                      style: {
                        base: {
                          color:
                            theme === "dark" || theme === "system"
                              ? "#fff"
                              : "#000",
                          iconColor:
                            theme === "dark" || theme === "system"
                              ? "#fff"
                              : "#000",
                        },
                      },
                      hidePostalCode: true,
                    }}
                    onChange={(e) => {
                      setValidCard(e.complete);
                    }}
                  />
                  <FormMessage />
                </FormItem>
              </fieldset>
              <fieldset>
                <FormField
                  control={form.control}
                  name="default"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 rounded-sm border border-foreground/10 py-2 px-3 ">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">
                          Make this default payment method
                        </FormLabel>
                        <FormDescription className="text-xs">
                          This will override the current subscription plan
                          proration setting.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </fieldset>
            </form>
          </Form>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              className="border-foreground/10"
              size={"sm"}
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            className={cn("children:hidden", {
              "children:inline-flex": loading,
            })}
            variant={"foreground"}
            onClick={form.handleSubmit(onSubmit)}
            size={"sm"}
            type="submit"
            disabled={!stripe || loading}
          >
            <Loader2 className="mr-2 h-4 w-4 hidden animate-spin" />
            Add Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
