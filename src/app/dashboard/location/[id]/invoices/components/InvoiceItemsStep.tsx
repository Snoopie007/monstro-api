"use client";

import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/forms";
import { Input, Textarea } from "@/components/forms";
import {
  CreateInvoiceFormData,
  formatInvoiceAmount,
  validateInvoiceTotal,
} from "@/libs/FormSchemas/CreateInvoiceSchema";
import { PlusIcon, Trash2Icon, DollarSignIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { usePastDueSubscriptions } from "@/hooks/usePastDueSubscriptions";
import { formatAmountForDisplay } from "@/libs/utils";

interface InvoiceItemsStepProps {
  form: UseFormReturn<CreateInvoiceFormData>;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
  locationId: string;
  memberId: string | null;
}

export function InvoiceItemsStep({
  form,
  onNext,
  onBack,
  isLoading,
  locationId,
  memberId,
}: InvoiceItemsStepProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  const watchedType = form.watch("type");
  const selectedSubscriptionId = form.watch("selectedSubscriptionId");
  const totalAmount = validateInvoiceTotal(watchedItems);

  // Fetch past due subscriptions
  const { pastDueSubscriptions } = usePastDueSubscriptions({
    locationId,
    memberId,
  });

  // Get the selected subscription if from-subscription type
  const selectedSubscription = pastDueSubscriptions.find(
    (sub) => sub.id === selectedSubscriptionId
  );

  const addItem = () => {
    append({
      id: crypto.randomUUID(),
      name: "",
      description: "",
      quantity: 1,
      price: 0,
    });
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const handleNext = () => {
    // Skip items validation for from-subscription type (items auto-populated by API)
    if (watchedType === 'from-subscription') {
      onNext();
      return;
    }

    // Validate current step fields for other types
    form.trigger("items").then((isValid) => {
      if (isValid) {
        onNext();
      }
    });
  };

  // Show subscription details if from-subscription type
  if (watchedType === "from-subscription" && selectedSubscription) {
    return (
      <div className="bg-muted/50 rounded-lg p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold">Subscription Details</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Invoice items will be automatically generated from the selected subscription.
          </p>
        </div>

        <Card className="border-foreground/10">
          <CardHeader>
            <CardTitle className="text-base">{selectedSubscription.plan?.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedSubscription.plan?.description && (
              <p className="text-sm text-muted-foreground">
                {selectedSubscription.plan.description}
              </p>
            )}
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-sm font-medium">Price:</span>
              <span className="text-lg font-semibold">
                {formatAmountForDisplay((selectedSubscription.pricing?.price ?? 0) / 100, 'usd', true)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Billing Interval:</span>
              <span>{selectedSubscription.pricing?.interval}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between pt-6">
          <Button type="button" onClick={onBack}>
            Back
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={isLoading}
          >
            {isLoading ? "Generating Preview..." : "Next: Preview Invoice"}
          </Button>
        </div>
      </div>
    );
  }

  // Show regular item entry for one-off and recurring invoices
  return (
    <div className="bg-muted/50 rounded-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Invoice Items</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Add line items to your invoice. Each item will appear as a separate
          line on the invoice.
        </p>
      </div>

      <Form {...form}>
        <div className="space-y-4">
          {fields.map((field, index) => (
            <Card
              key={field.id}
              className="relative border-foreground/10 shadow-md rounded-md"
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    Item {index + 1}
                  </CardTitle>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Item Name */}
                  <FormField
                    control={form.control}
                    name={`items.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter item name..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Price */}
                  <FormField
                    control={form.control}
                    name={`items.${index}.price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (USD)</FormLabel>
                        <div className="relative">
                          <DollarSignIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="pl-8"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value) || 0)
                              }
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Quantity */}
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="999"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 1)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Line Total (calculated) */}
                  <div className="flex flex-col">
                    <FormLabel className="font-medium">Line Total</FormLabel>
                    <div className="mt-2 px-2 py-2 rounded-sm text-sm font-medium bg-muted-foreground/10 shadow-md">
                      {formatInvoiceAmount(
                        (watchedItems[index]?.price || 0) *
                          (watchedItems[index]?.quantity || 1) *
                          100
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <FormField
                  control={form.control}
                  name={`items.${index}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter item description..."
                          className="resize-none border-foreground/10"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Additional details about this item that will appear on
                        the invoice.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          ))}

          {/* Add Item Button */}
          {fields.length < 20 && (
            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              className="w-full border-foreground/10"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Another Item
            </Button>
          )}
        </div>

        {/* Invoice Total Summary */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-lg font-semibold text-blue-900">
                  Invoice Total
                </h4>
                <p className="text-sm text-blue-700">
                  {watchedItems.length} item
                  {watchedItems.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-900">
                  {formatInvoiceAmount(totalAmount * 100)}
                </div>
                <p className="text-xs text-blue-600">
                  Excludes tax (calculated by Stripe)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button type="button" onClick={onBack}>
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={isLoading || totalAmount === 0}
          >
            {isLoading ? "Generating Preview..." : "Next: Preview Invoice"}
          </Button>
        </div>
      </Form>
    </div>
  );
}
