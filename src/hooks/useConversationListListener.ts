import supabase from '@/libs/client/supabase';
import { useEffect, useRef } from 'react';
import { useSession } from './useSession';

export const useConversationListListener = (
  onConversationUpdate: (payload: any) => void
) => {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  
  // Use a ref to store the latest callback to avoid re-subscribing if the function identity changes
  const callbackRef = useRef(onConversationUpdate);

  useEffect(() => {
    callbackRef.current = onConversationUpdate;
  }, [onConversationUpdate]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`chats:${userId}`, {
      config: {
        private: true,
      }
    });

    channel
      .on('broadcast', { event: 'chat_updated' }, (payload) => {
        if (callbackRef.current) {
            callbackRef.current(payload.payload);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [userId]);
};
