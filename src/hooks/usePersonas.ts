"use client";

import { useState, useCallback } from "react";
import { toast } from "react-toastify";
import { AIPersona } from "@/types/bots";
import { AIPersonaFormData } from "@/app/dashboard/location/[id]/bots/components/Settings/Persona/PersonaSchema";

export function usePersonas(locationId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPersona = useCallback(
    async (data: AIPersonaFormData): Promise<AIPersona | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/protected/loc/${locationId}/personas`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: data.name,
              image: data.image,
              responseDetails: data.responseDetails,
              personality: data.personality,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to create persona");
        }

        const result = await response.json();
        const newPersona = result.persona;

        toast.success("AI Persona created successfully!");
        return newPersona;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create persona";
        setError(errorMessage);
        toast.error(errorMessage);
        console.error("Failed to create persona:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [locationId]
  );

  const fetchPersonas = useCallback(async (): Promise<AIPersona[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/protected/loc/${locationId}/personas`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch personas");
      }

      const result = await response.json();
      return result.personas || [];
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch personas";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Failed to fetch personas:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  return {
    createPersona,
    fetchPersonas,
    loading,
    error,
  };
}
