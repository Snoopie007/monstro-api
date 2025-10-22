// 'use client'

// import { MemberInvoice } from '@/types'
// import { format } from 'date-fns'
// import { formatAmountForDisplay } from '@/libs/utils'
// import {
//     Dialog,
//     DialogContent,
//     DialogHeader,
//     DialogTitle,
//     DialogFooter,
// } from '@/components/ui/dialog'
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { Badge, Button, Separator } from '@/components/ui'
// import { Download } from 'lucide-react'

// interface InvoiceDetailDialogProps {
//     invoice: MemberInvoice | null
//     open: boolean
//     onOpenChange: (open: boolean) => void
// }

// export function InvoiceDetailDialog({
//     invoice,
//     open,
//     onOpenChange,
// }: InvoiceDetailDialogProps) {
//     if (!invoice) return null

//     const getStatusColor = (status: string) => {
//         switch (status) {
//             case 'paid':
//                 return 'bg-green-500'
//             case 'sent':
//                 return 'bg-blue-500'
//             case 'failed':
//                 return 'bg-red-500'
//             default:
//                 return 'bg-gray-500'
//         }
//     }

//     const handleDownloadPdf = () => {
//         if (invoice.invoicePdf) {
//             window.open(invoice.invoicePdf, '_blank')
//         }
//     }

//     // const handleMarkAsPaid = async () => {
//     //     // This would need an API endpoint to update the invoice status
//     //     // Implementation would depend on your backend setup
//     //     console.log('Mark invoice as paid:', invoice.id)
//     // }

//     return (
//         <Dialog open={open} onOpenChange={onOpenChange}>
//             <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-foreground/10">
//                 <DialogHeader>
//                     <div className="flex items-center justify-between">
//                         <DialogTitle className="text-xl">
//                             Invoice Details
//                         </DialogTitle>
//                         <Badge className={getStatusColor(invoice.status)}>
//                             {invoice.status.charAt(0).toUpperCase() +
//                                 invoice.status.slice(1)}
//                         </Badge>
//                     </div>
//                 </DialogHeader>

//                 <div className="space-y-6 p-6">
//                     {/* Invoice Header Info */}
//                     <Card className="border-none bg-muted rounded-lg">
//                         <CardHeader>
//                             <CardTitle className="text-base">
//                                 Invoice Information
//                             </CardTitle>
//                         </CardHeader>
//                         <CardContent className="space-y-4">
//                             <div className="grid grid-cols-2 gap-4 text-sm">
//                                 <div>
//                                     <span className="font-medium text-muted-foreground">
//                                         Invoice ID:
//                                     </span>
//                                     <p className="text-foreground">
//                                         {invoice.id.slice(0, 7)}...
//                                         {invoice.id.slice(-4)}
//                                     </p>
//                                 </div>
//                                 <div>
//                                     <span className="font-medium text-muted-foreground">
//                                         Created:
//                                     </span>
//                                     <p className="text-foreground">
//                                         {format(invoice.created, 'MMM d, yyyy')}
//                                     </p>
//                                 </div>
//                                 <div>
//                                     <span className="font-medium text-muted-foreground">
//                                         Due Date:
//                                     </span>
//                                     <p className="text-foreground">
//                                         {format(invoice.dueDate, 'MMM d, yyyy')}
//                                     </p>
//                                 </div>
//                                 <div>
//                                     <span className="font-medium text-muted-foreground">
//                                         Currency:
//                                     </span>
//                                     <p className="text-foreground">
//                                         {invoice.currency}
//                                     </p>
//                                 </div>
//                                 {invoice.forPeriodStart &&
//                                     invoice.forPeriodEnd && (
//                                         <div className="col-span-2">
//                                             <span className="font-medium text-muted-foreground">
//                                                 Billing Period:
//                                             </span>
//                                             <p className="text-foreground">
//                                                 {format(
//                                                     invoice.forPeriodStart,
//                                                     'MMM d, yyyy'
//                                                 )}{' '}
//                                                 -{' '}
//                                                 {format(
//                                                     invoice.forPeriodEnd,
//                                                     'MMM d, yyyy'
//                                                 )}
//                                             </p>
//                                         </div>
//                                     )}
//                                 {invoice.description && (
//                                     <div className="col-span-2">
//                                         <span className="font-medium text-muted-foreground">
//                                             Description:
//                                         </span>
//                                         <p className="text-foreground">
//                                             {invoice.description}
//                                         </p>
//                                     </div>
//                                 )}
//                             </div>
//                         </CardContent>
//                     </Card>

//                     {/* Line Items */}
//                     {invoice.items && invoice.items.length > 0 && (
//                         <Card className="border-none">
//                             <CardHeader>
//                                 <CardTitle className="text-base">
//                                     Line Items
//                                 </CardTitle>
//                             </CardHeader>
//                             <CardContent>
//                                 <div className="space-y-3">
//                                     {invoice.items.map(
//                                         (item: any, index: number) => (
//                                             <div
//                                                 key={index}
//                                                 className="flex justify-between items-start p-3 bg-muted rounded-lg"
//                                             >
//                                                 <div className="flex-1">
//                                                     <div className="font-medium">
//                                                         {item.name}
//                                                     </div>
//                                                     {item.description && (
//                                                         <div className="text-xs text-muted-foreground">
//                                                             {item.description}
//                                                         </div>
//                                                     )}
//                                                     <div className="text-xs text-muted-foreground mt-1">
//                                                         Qty: {item.quantity} ×{' '}
//                                                         {formatAmountForDisplay(
//                                                             item.price,
//                                                             invoice.currency!
//                                                         )}
//                                                     </div>
//                                                 </div>
//                                                 <div className="font-medium ml-4 whitespace-nowrap">
//                                                     {formatAmountForDisplay(
//                                                         (item.price *
//                                                             item.quantity) /
//                                                             100,
//                                                         invoice.currency!
//                                                     )}
//                                                 </div>
//                                             </div>
//                                         )
//                                     )}
//                                 </div>
//                             </CardContent>
//                         </Card>
//                     )}

//                     {/* Totals */}
//                     <Card className="bg-muted border-none rounded-lg">
//                         <CardContent className="space-y-3 pt-6">
//                             <div className="flex justify-between text-sm">
//                                 <span className="text-muted-foreground">
//                                     Subtotal:
//                                 </span>
//                                 <span>
//                                     {formatAmountForDisplay(
//                                         invoice.subtotal / 100,
//                                         invoice.currency!
//                                     )}
//                                 </span>
//                             </div>
//                             {invoice.discount > 0 && (
//                                 <div className="flex justify-between text-sm">
//                                     <span className="text-muted-foreground">
//                                         Discount:
//                                     </span>
//                                     <span className="text-green-600">
//                                         -
//                                         {formatAmountForDisplay(
//                                             invoice.discount / 100,
//                                             invoice.currency!
//                                         )}
//                                     </span>
//                                 </div>
//                             )}
//                             {invoice.tax > 0 && (
//                                 <div className="flex justify-between text-sm">
//                                     <span className="text-muted-foreground">
//                                         Tax:
//                                     </span>
//                                     <span>
//                                         {formatAmountForDisplay(
//                                             invoice.tax / 100,
//                                             invoice.currency!
//                                         )}
//                                     </span>
//                                 </div>
//                             )}
//                             <Separator className="my-2" />
//                             <div className="flex justify-between text-lg font-semibold">
//                                 <span>Total:</span>
//                                 <span className="text-blue-600 dark:text-blue-400">
//                                     {formatAmountForDisplay(
//                                         invoice.total / 100,
//                                         invoice.currency!
//                                     )}
//                                 </span>
//                             </div>
//                         </CardContent>
//                     </Card>
//                 </div>

//                 <DialogFooter className="flex items-center justify-between gap-2">
//                     <div className="flex gap-2">
//                         {invoice.invoicePdf && (
//                             <Button
//                                 variant="outline"
//                                 size="sm"
//                                 onClick={handleDownloadPdf}
//                             >
//                                 <Download className="w-4 h-4 mr-2" />
//                                 Download PDF
//                             </Button>
//                         )}
//                         {/* {invoice.status !== 'paid' && (
//                             <Button
//                                 variant="outline"
//                                 size="sm"
//                                 onClick={handleMarkAsPaid}
//                             >
//                                 Mark as Paid
//                             </Button>
//                         )} */}
//                     </div>
//                     <Button
//                         variant="default"
//                         size="sm"
//                         onClick={() => onOpenChange(false)}
//                     >
//                         Close
//                     </Button>
//                 </DialogFooter>
//             </DialogContent>
//         </Dialog>
//     )
// }
