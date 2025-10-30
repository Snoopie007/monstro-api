import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import type { MemberSubscription } from '@/types';
import { useMemberInvoices } from './hooks';

export function useInvoiceReminder(subscription: MemberSubscription) {
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [hasExistingInvoice, setHasExistingInvoice] = useState(false);
  const { invoices: memberInvoices } = useMemberInvoices(subscription.locationId, subscription.memberId)

  // Check for existing draft invoices on mount
  useEffect(() => {
    async function checkExistingInvoice() {
      try {
        const hasExistingInvoice = memberInvoices.some(
          (inv: { memberSubscriptionId?: string; status?: string }) => {
            return inv.memberSubscriptionId === subscription.id && 
              (inv.status === 'draft' || inv.status === 'paid');
          }
        );
        setHasExistingInvoice(hasExistingInvoice);
      } catch (error) {
        console.error('Error checking existing invoices:', error);
      }
    }

    // Only check if subscription is manual/cash and active
    if (
      (subscription.paymentMethod === 'cash' || subscription.paymentMethod === 'manual') &&
      subscription.status === 'active'
    ) {
      checkExistingInvoice();
    }
  }, [subscription.id, subscription.paymentMethod, subscription.status, memberInvoices]);

  const shouldShowReminder = (): boolean => {
    // Only show for manual/cash subscriptions
    if (subscription.paymentMethod !== 'cash' && subscription.paymentMethod !== 'manual') {
      return false;
    }
    
    // Only show for active subscriptions
    if (subscription.status !== 'active') {
      return false;
    }
    
    // Don't show if invoice already exists for this period
    if (hasExistingInvoice) {
      return false;
    }
    
    // Check if currentPeriodEnd is within 2 days
    const now = new Date();
    const nextBillingDate = new Date(subscription.currentPeriodEnd);
    const daysUntilBilling = Math.floor(
      (nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Show reminder if billing date is within 2 days (only before, not after)
    return daysUntilBilling >= 0 && daysUntilBilling <= 2;
  };

  const getReminderMessage = (): { text: string; variant: 'warning' } => {
    const now = new Date();
    const nextBillingDate = new Date(subscription.currentPeriodEnd);
    const daysUntilBilling = Math.floor(
      (nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilBilling === 0) {
      return { 
        text: 'Billing date is today - Generate invoice now', 
        variant: 'warning' 
      };
    } else if (daysUntilBilling === 1) {
      return { 
        text: 'Next invoice due tomorrow', 
        variant: 'warning' 
      };
    } else {
      return { 
        text: `Next invoice due in ${daysUntilBilling} days`, 
        variant: 'warning' 
      };
    }
  };

  const handleGenerateInvoice = async () => {
    setIsGeneratingInvoice(true);
    try {
      const response = await fetch(
        `/api/protected/loc/${subscription.locationId}/members/${subscription.memberId}/subs/${subscription.id}/generate`,
        { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' } 
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate invoice');
      }

      toast.success('Invoice generated as draft');
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate invoice'
      );
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  return {
    shouldShowReminder: shouldShowReminder(),
    reminderMessage: getReminderMessage(),
    isGeneratingInvoice,
    handleGenerateInvoice,
    hasExistingInvoice,
    setHasExistingInvoice,
  };
}

