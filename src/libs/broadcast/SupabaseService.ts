import type { RealtimeChannel, RealtimeClient, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

class SupabaseService {
    private static instance: SupabaseService;
    private client: SupabaseClient | null = null;
    private realtimeClient: RealtimeClient | null = null;
    private token: string | null = null;


    private constructor() {

        if (!Bun.env.SUPABASE_URL || !Bun.env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Supabase URL and Service Role Key must be provided');
        }

        this.client = createClient(
            Bun.env.SUPABASE_URL,
            Bun.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: false,
                },
                realtime: {
                    params: {
                        eventsPerSecond: 100,
                    },
                },
            });
    }

    public setRealtimeAuth(token: string): void {
        if (!this.token) {
            this.token = token;
        }

        this.client?.realtime.setAuth(this.token);
    }

    public getRealtimeClient(): RealtimeClient | null {
        return this.realtimeClient;
    }


    public createChannel(name: string, presenceKey?: string): RealtimeChannel {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        const channel = this.client.channel(name, {
            config: {
                private: true,
                presence: presenceKey ? {
                    key: presenceKey,
                } : undefined,
                broadcast: {
                    ack: false
                }
            }
        });
        return channel;
    }


    public removeChannel(channel: RealtimeChannel) {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        this.client.removeChannel(channel);
    }

    public clearToken() {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        this.token = null;
        this.client?.realtime.setAuth(null);
    }

    public static getInstance(): SupabaseService {
        if (!SupabaseService.instance) {
            SupabaseService.instance = new SupabaseService();
        }
        return SupabaseService.instance;
    }
}


const supabase = SupabaseService.getInstance();


export default supabase;
