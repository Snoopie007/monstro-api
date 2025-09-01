import { useState, useCallback, useEffect } from "react";
import { Bot, BotTemplate } from "@/types/bots";
import { toast } from "react-toastify";

interface UseBotsReturn {
  bots: Bot[];
  loading: boolean;
  error: string | null;
  createBot: (
    botData: Partial<Bot>,
    template?: BotTemplate
  ) => Promise<Bot | null>;
  updateBot: (botId: string, updates: Partial<Bot>) => Promise<Bot | null>;
  deleteBot: (botId: string) => Promise<boolean>;
  refreshBots: () => Promise<void>;
}

export function useBots(locationId: string): UseBotsReturn {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);

  const refreshBots = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/protected/loc/${locationId}/bots`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      // Map API response: 'personas' -> 'persona' for frontend compatibility
      const mappedBots = (data.bots || []).map((bot: any) => ({
        ...bot,
        persona: bot.personas || [], // Map personas array to persona
      }));
      setBots(mappedBots);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load bots";
      setError(errorMessage);
      toast.error(errorMessage);
      setBots([]);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  const createBot = useCallback(
    async (
      botData: Partial<Bot>,
      template?: BotTemplate
    ): Promise<Bot | null> => {
      try {
        setLoading(true);
        setError(null);

        // Prepare bot data with template if provided
        const finalBotData = {
          ...botData,
          prompt:
            template?.prompt ||
            botData.prompt ||
            "You are a helpful AI assistant.",
          initialMessage:
            template?.initialMessage || botData.initialMessage || null,
          objectives: template?.objectives || botData.objectives || [],
          invalidNodes: template?.invalidNodes || botData.invalidNodes || [],
        };

        const response = await fetch(`/api/protected/loc/${locationId}/bots`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalBotData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to create bot");
        }

        const data = await response.json();
        const newBot = {
          ...data.bot,
          persona: data.bot.personas || [], // Map personas -> persona
        };

        setBots((prev) => [...prev, newBot]);
        toast.success("Bot created successfully!");

        return newBot;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create bot";
        setError(errorMessage);
        toast.error(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [locationId]
  );

  const updateBot = useCallback(
    async (botId: string, updates: Partial<Bot>): Promise<Bot | null> => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/protected/loc/${locationId}/bots/${botId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to update bot");
        }

        const data = await response.json();
        const updatedBot = {
          ...data.bot,
          persona: data.bot.personas || [], // Map personas -> persona
        };

        setBots((prev) =>
          prev.map((bot) => (bot.id === botId ? updatedBot : bot))
        );
        toast.success("Bot updated successfully!");

        return updatedBot;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update bot";
        setError(errorMessage);
        toast.error(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [locationId]
  );

  const deleteBot = useCallback(
    async (botId: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/protected/loc/${locationId}/bots/${botId}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to delete bot");
        }

        setBots((prev) => prev.filter((bot) => bot.id !== botId));
        toast.success("Bot deleted successfully!");

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete bot";
        setError(errorMessage);
        toast.error(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [locationId]
  );

  // Load bots on mount
  useEffect(() => {
    refreshBots();
  }, [refreshBots]);

  return {
    bots,
    loading,
    error,
    createBot,
    updateBot,
    deleteBot,
    refreshBots,
  };
}
