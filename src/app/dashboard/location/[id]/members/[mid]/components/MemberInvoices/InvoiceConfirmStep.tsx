"use client";

import { Button } from "@/components/ui";
import { CheckCircle, ExternalLink, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui";

interface InvoiceConfirmStepProps {
  invoice: any;
  onSend: () => Promise<void>;
  isSending: boolean;
  onClose: () => void;
  memberName: string;
}

export function InvoiceConfirmStep({
  invoice,
  onSend,
  isSending,
  onClose,
  memberName,
}: InvoiceConfirmStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-green-900 mb-2">
          Invoice Created Successfully!
        </h3>
        <p className="text-sm text-gray-600">
          Your invoice for {memberName} has been created and is ready to send.
        </p>
      </div>

      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-green-800">
                Invoice ID:
              </span>
              <span className="text-sm text-green-700 font-mono">
                {invoice?.invoice?.id || "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-green-800">
                Status:
              </span>
              <span className="text-sm text-green-700 capitalize">
                {invoice?.invoice?.status || "Draft"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-green-800">Total:</span>
              <span className="text-sm text-green-700 font-semibold">
                ${((invoice?.invoice?.total || 0) / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>
            Click "Send Invoice" to finalize and send the invoice via Stripe
          </li>
          <li>{memberName} will receive an email with payment instructions</li>
          <li>You can track payment status in the invoices list</li>
          <li>Stripe will handle payment processing and confirmations</li>
        </ul>
      </div>

      <div className="flex justify-between pt-6 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button
          onClick={onSend}
          disabled={isSending}
          className="bg-green-600 hover:bg-green-700"
        >
          <Send className="w-4 h-4 mr-2" />
          {isSending ? "Sending..." : "Send Invoice"}
        </Button>
      </div>
    </div>
  );
}
