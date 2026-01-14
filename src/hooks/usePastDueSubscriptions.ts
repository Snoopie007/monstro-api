import useSWR from 'swr';
import type { MemberSubscription } from '@/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface UsePastDueSubscriptionsProps {
  locationId: string;
  memberId: string | null;
}

export function usePastDueSubscriptions({ 
  locationId, 
  memberId 
}: UsePastDueSubscriptionsProps) {
  const { data: subscriptions, isLoading, error } = useSWR<MemberSubscription[]>(
    memberId && locationId 
      ? `/api/protected/loc/${locationId}/members/${memberId}/subs`
      : null,
    fetcher
  );

  // Filter for past_due status and manual/cash payment methods
  const pastDueSubscriptions = subscriptions?.filter(
    (sub) => 
      sub.status === 'past_due' && 
      (sub.paymentType === 'cash')
    ) ?? [];

  return { pastDueSubscriptions, isLoading, error };
}
