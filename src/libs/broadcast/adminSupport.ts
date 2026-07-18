import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AdminSupportBroadcastEvent =
  | "new_message"
  | "case_updated"
  | "case_log"
  | "case_inserted";

let adminClient: SupabaseClient | undefined;
let adminServiceKey: string | undefined;

function getClient() {
  if (adminClient && adminServiceKey) {
    return { client: adminClient, serviceKey: adminServiceKey };
  }

  const url = Bun.env.SUPABASE_ADMIN_URL;
  const serviceKey = Bun.env.SUPABASE_ADMIN_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_ADMIN_URL and SUPABASE_ADMIN_SERVICE_ROLE_KEY are required");
  }

  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 100 } },
  });
  adminServiceKey = serviceKey;
  return { client: adminClient, serviceKey };
}

export async function broadcastAdminSupport(
  channelName: string,
  event: AdminSupportBroadcastEvent,
  payload: unknown,
) {
  const startedAt = Date.now();
  console.info("[Admin Support Realtime] Publishing", { channelName, event });

  const { client, serviceKey } = getClient();
  const channel = client.channel(channelName, {
    config: { private: true, broadcast: { ack: false } },
  });

  try {
    await client.realtime.setAuth(serviceKey);
    const result = await channel
      .httpSend(event, payload)
      .catch((error: unknown) => ({ success: false as const, error }));

    if (!result.success) {
      throw "error" in result ? result.error : new Error("Supabase rejected the broadcast");
    }

    console.info("[Admin Support Realtime] Published", {
      channelName,
      event,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("[Admin Support Realtime] Publish failed", {
      channelName,
      event,
      durationMs: Date.now() - startedAt,
      error,
    });
    throw error;
  } finally {
    await client.removeChannel(channel);
  }
}

export async function broadcastAdminSupportCase(
  caseId: number,
  event: AdminSupportBroadcastEvent,
  payload: unknown,
) {
  await broadcastAdminSupport(`admin-support:case:${caseId}`, event, payload);
}
