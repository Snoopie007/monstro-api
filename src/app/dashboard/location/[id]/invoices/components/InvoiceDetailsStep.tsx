'use client'

import { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/forms'
import { Input, Textarea } from '@/components/forms'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/forms'
import { CreateInvoiceFormData } from '@/libs/FormSchemas/CreateInvoiceSchema'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn, formatAmountForDisplay } from '@/libs/utils'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
    Calendar,
} from '@/components/ui'
import { usePastDueSubscriptions } from '@/hooks/usePastDueSubscriptions'

interface InvoiceDetailsStepProps {
    form: UseFormReturn<CreateInvoiceFormData>
    onNext: () => void
    hasStripeCustomer: boolean
    locationId: string
    memberId: string | null
}

export function InvoiceDetailsStep({ form, onNext, hasStripeCustomer, locationId, memberId }: InvoiceDetailsStepProps) {
    const watchedType = form.watch('type')
    const watchedCollectionMethod = form.watch('collectionMethod')
    const watchedStartDate = form.watch('recurringSettings.startDate')
    const watchedSelectedSubscriptionId = form.watch('selectedSubscriptionId')

    // Fetch past due subscriptions
    const { pastDueSubscriptions, isLoading: isLoadingSubscriptions } = usePastDueSubscriptions({
        locationId,
        memberId,
    })

    const handleNext = () => {
        // Validate current step fields
        const fieldsToValidate: (keyof CreateInvoiceFormData)[] = [
            'type',
            'collectionMethod',
        ]

        // Add selectedSubscriptionId validation if from-subscription type
        if (watchedType === 'from-subscription') {
            fieldsToValidate.push('selectedSubscriptionId')
        }

        form.trigger(fieldsToValidate).then((isValid) => {
            if (isValid) {
                onNext();
            }
        })
    }

    return (
        <div className="bg-muted/50 rounded-lg p-6 space-y-6">
            <div>
                <h3 className="text-lg font-semibold">Invoice Details</h3>
                <p className="text-sm text-muted-foreground mb-6">
                    Configure the basic settings for your invoice.
                </p>
            </div>

            <Form {...form}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Invoice Type */}
                    <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Invoice Type</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger className="border-none rounded-lg">
                                            <SelectValue placeholder="Select invoice type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="one-off">
                                            One-time Invoice
                                        </SelectItem>
                                        {hasStripeCustomer && <SelectItem value="recurring">
                                            Recurring Invoice
                                        </SelectItem>}
                                        {!hasStripeCustomer && pastDueSubscriptions.length > 0 && (
                                            <SelectItem value="from-subscription">
                                                From Past Due Subscription
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                <FormDescription>
                                    {watchedType === 'one-off'
                                        ? 'A single invoice that will be sent once'
                                        : watchedType === 'recurring'
                                        ? 'A recurring invoice based on a schedule'
                                        : 'Generate an invoice for a past due subscription'}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Subscription Selector (only for from-subscription type) */}
                    {watchedType === 'from-subscription' && (
                        <FormField
                            control={form.control}
                            name="selectedSubscriptionId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Select Subscription</FormLabel>
                                    <Select 
                                        onValueChange={field.onChange} 
                                        defaultValue={field.value}
                                        disabled={isLoadingSubscriptions}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="border-none rounded-lg">
                                                <SelectValue placeholder={
                                                    isLoadingSubscriptions 
                                                        ? "Loading subscriptions..." 
                                                        : "Choose a past due subscription"
                                                } />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {pastDueSubscriptions.map((sub) => (
                                                <SelectItem key={sub.id} value={sub.id}>
                                                    {sub.plan?.name} - {formatAmountForDisplay((sub.plan?.price ?? 0) / 100, 'usd', true)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Select a subscription to generate an invoice for this billing period
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    {/* Collection Method */}
                    <FormField
                        control={form.control}
                        name="collectionMethod"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Collection Method</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger className="border-none rounded-lg">
                                            <SelectValue placeholder="Select collection method" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="send_invoice">
                                            Send for Payment
                                        </SelectItem>
                                        {hasStripeCustomer && <SelectItem value="charge_automatically">
                                            Charge Automatically
                                        </SelectItem>}
                                    </SelectContent>
                                </Select>
                                <FormDescription>
                                    {watchedCollectionMethod === 'send_invoice'
                                        ? 'Member will receive an email with payment instructions'
                                        : "Automatically charge the member's default payment method"}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                    control={form.control}
                    name="paymentType"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger className="border-none rounded-lg">
                                <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value='cash'>Cash (Cash/Check)</SelectItem>
                            {hasStripeCustomer && <SelectItem value="card">Card (Stripe)</SelectItem>}
                            </SelectContent>
                        </Select>
                        <FormDescription>
                            {field.value === 'cash'
                            ? 'Invoice will be created as draft. You can mark it as sent and collect payment manually.'
                            : 'Invoice will be processed through Stripe'}
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    {/* Due Date (only for send_invoice and not from-subscription) */}
                    {watchedCollectionMethod === 'send_invoice' && watchedType !== 'from-subscription' && (
                        <FormField
                            control={form.control}
                            name="dueDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Due Date (Optional)</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={'outline'}
                                                    className={cn(
                                                        'w-full pl-3 text-left font-normal border-none',
                                                        !field.value &&
                                                            'text-muted-foreground'
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(
                                                            field.value,
                                                            'PPP'
                                                        )
                                                    ) : (
                                                        <span>
                                                            Pick a due date
                                                        </span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-auto p-0 border-none"
                                            align="start"
                                        >
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date < new Date()
                                                }
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormDescription>
                                        When should this invoice be paid? Leave
                                        empty for "due on receipt".
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    {/* Description */}
                    <div className="md:col-span-2">
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Description (Optional)
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Enter a description for this invoice..."
                                            className="resize-none border-none rounded-lg"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        This description will appear on the
                                        invoice sent to the member.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Recurring Settings */}
                {watchedType === 'recurring' && (
                    <div className="pt-6">
                        <h4 className="text-md font-medium mb-4">
                            Recurring Settings
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Billing Interval */}
                            <FormField
                                control={form.control}
                                name="recurringSettings.interval"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Billing Interval</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="border-none rounded-lg">
                                                    <SelectValue placeholder="Select interval" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="day">
                                                    Daily
                                                </SelectItem>
                                                <SelectItem value="week">
                                                    Weekly
                                                </SelectItem>
                                                <SelectItem value="month">
                                                    Monthly
                                                </SelectItem>
                                                <SelectItem value="year">
                                                    Yearly
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Interval Count */}
                            <FormField
                                control={form.control}
                                name="recurringSettings.intervalCount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Every</FormLabel>
                                        <FormControl>
                                            <Input
                                                className="border-none rounded-lg"
                                                type="number"
                                                min="1"
                                                max="12"
                                                {...field}
                                                // onChange={(e) =>
                                                //     field.onChange(
                                                //         parseInt(
                                                //             e.target.value
                                                //         ) || 1
                                                //     )
                                                // }
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Bill every N intervals
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Start Date */}
                            <FormField
                                control={form.control}
                                name="recurringSettings.startDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Start Date</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={'outline'}
                                                        className={cn(
                                                            'w-full pl-3 text-left font-normal border-none',
                                                            !field.value &&
                                                                'text-muted-foreground'
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(
                                                                field.value,
                                                                'PPP'
                                                            )
                                                        ) : (
                                                            <span>
                                                                Pick start date
                                                            </span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-auto p-0 border-none"
                                                align="start"
                                            >
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) =>
                                                        date < new Date()
                                                    }
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* End Date */}
                            <FormField
                                control={form.control}
                                name="recurringSettings.endDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>
                                            End Date (Optional)
                                        </FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={'outline'}
                                                        className={cn(
                                                            'w-full pl-3 text-left font-normal border-none',
                                                            !field.value &&
                                                                'text-muted-foreground'
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(
                                                                field.value,
                                                                'PPP'
                                                            )
                                                        ) : (
                                                            <span>
                                                                No end date
                                                            </span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-auto p-0 border-none"
                                                align="start"
                                            >
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) => {
                                                        return (
                                                            date < new Date() ||
                                                            (watchedStartDate &&
                                                                date <=
                                                                    watchedStartDate)
                                                        )
                                                    }}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormDescription>
                                            Leave empty to continue indefinitely
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-6">
                    <Button onClick={handleNext}>Next: Add Items</Button>
                </div>
            </Form>
        </div>
    )
}
