import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    Popover,
    PopoverTrigger,
    PopoverContent,
} from '@/components/ui'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from '@/components/forms/form'
import { Input } from '@/components/forms/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/forms/select'
import { Textarea } from '@/components/forms/textarea'
import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { MemberInvoice } from '@/types'
import { toast } from 'react-toastify'
import { Calendar } from '@/components/ui/calendar'
import { ChevronDownIcon } from 'lucide-react'
import { Label } from '@/components/forms/label'

const MarkPaidSchema = z.object({
    paidAmount: z.string().min(1, 'Amount is required'),
    paidDate: z
        .string()
        .min(1, 'Date is required'),
    paymentMethod: z.enum(['cash', 'check', 'bank_transfer']).default('cash'),
    notes: z.string().optional(),
})

export const MarkPaid = ({
    isOpen,
    setIsOpen,
    invoice,
    params,
    onPaid,
}: {
    isOpen: boolean
    setIsOpen: (isOpen: boolean) => void
    invoice: MemberInvoice
    params: { id: string; mid: string }
    onPaid: () => void
}) => {
    const [isLoading, setIsLoading] = useState(false)
    const [datePickerOpen, setDatePickerOpen] = useState(false)

    const form = useForm<z.infer<typeof MarkPaidSchema>>({
        resolver: zodResolver(MarkPaidSchema),
        defaultValues: {
            paidAmount: (invoice.total / 100).toString(),
            paidDate: format(new Date(), 'yyyy-MM-dd'),
            paymentMethod: 'cash',
            notes: '',
        },
    })

    async function onMarkPaid(values: z.infer<typeof MarkPaidSchema>) {
        setIsLoading(true)
        try {
            const response = await fetch(
                `/api/protected/loc/${params.id}/members/${params.mid}/invoices/${invoice.id}/paid`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        paidAmount: parseFloat(values.paidAmount),
                        paidDate: values.paidDate,
                        paymentMethod: values.paymentMethod,
                        notes: values.notes,
                    }),
                }
            )

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to mark as paid')
            }

            toast.success('Invoice marked as paid')
            setIsOpen(false)
            onPaid()
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to mark as paid'
            )
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <DropdownMenuItem asChild>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button
                        type="button"
                        variant="menu"
                        size="sm"
                        className="text-xs"
                    >
                        Mark as Paid
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm p-4">
                    <DialogTitle className="mb-4">Mark Invoice as Paid</DialogTitle>
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onMarkPaid)}
                            className="space-y-4"
                        >
                            <FormField
                                control={form.control}
                                name="paidAmount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount Paid</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                disabled={true}
                                                step="0.01"
                                                placeholder="0.00"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="paidDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Payment Date</FormLabel>
                                        <FormControl>
                                            <div className="flex flex-col gap-3 w-full">
                                                <Popover
                                                    open={datePickerOpen}
                                                    onOpenChange={setDatePickerOpen}
                                                >
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            type="button"
                                                            id="date"
                                                            className="w-full justify-between font-normal"
                                                        >
                                                            {field.value
                                                                ? format(
                                                                      new Date(
                                                                          field.value
                                                                      ),
                                                                      'PPP'
                                                                  )
                                                                : 'Select date'}
                                                            <ChevronDownIcon />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent
                                                        className="w-auto overflow-hidden p-0"
                                                        align="start"
                                                    >
                                                        <Calendar
                                                            mode="single"
                                                            disabled={(date) =>
                                                                date >
                                                                new Date()
                                                            }
                                                            selected={
                                                                field.value
                                                                    ? new Date(
                                                                          field.value as string
                                                                      )
                                                                    : undefined
                                                            }
                                                            captionLayout="dropdown"
                                                            onSelect={(
                                                                date
                                                            ) => {
                                                                field.onChange(
                                                                    date
                                                                        ? date.toISOString()
                                                                        : ''
                                                                )
                                                            }}
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="paymentMethod"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Payment Method</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select method" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="cash">
                                                    Cash
                                                </SelectItem>
                                                <SelectItem value="check">
                                                    Check
                                                </SelectItem>
                                                <SelectItem value="bank_transfer">
                                                    Bank Transfer
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes (optional)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Add any notes about this payment..."
                                                className="resize-none"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button
                                        variant="outline"
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading
                                        ? 'Saving...'
                                        : 'Confirm Payment'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </DropdownMenuItem>
    )
}
