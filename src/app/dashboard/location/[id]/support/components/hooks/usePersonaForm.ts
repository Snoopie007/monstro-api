import { useState, useEffect, useCallback } from "react";
import { SupportBotPersona } from "@/types/supportBot";

export interface PersonaFormData {
  name: string;
  image: string;
  responseStyle: string;
  personalityTraits: string[];
}

const getInitialFormData = (initialData?: SupportBotPersona | null): PersonaFormData => ({
  name: initialData?.name || "",
  image: initialData?.image || "",
  responseStyle: initialData?.responseStyle || "",
  personalityTraits: initialData?.personalityTraits || [],
});

export function usePersonaForm(initialData?: SupportBotPersona | null) {
  const [formData, setFormData] = useState<PersonaFormData>(() => 
    getInitialFormData(initialData)
  );

  // Update form data when initialData changes
  useEffect(() => {
    setFormData(getInitialFormData(initialData));
  }, [initialData]);

  const updateField = useCallback((field: keyof PersonaFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const addPersonalityTrait = useCallback((trait: string) => {
    const trimmedTrait = trait.trim();
    if (trimmedTrait && !formData.personalityTraits.includes(trimmedTrait)) {
      setFormData(prev => ({
        ...prev,
        personalityTraits: [...prev.personalityTraits, trimmedTrait],
      }));
      return true; // Success
    }
    return false; // Failed to add
  }, [formData.personalityTraits]);

  const removePersonalityTrait = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      personalityTraits: prev.personalityTraits.filter((_, i) => i !== index),
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(getInitialFormData());
  }, []);

  const validateForm = useCallback(() => {
    const errors: string[] = [];
    
    if (!formData.name.trim()) {
      errors.push("Persona name is required");
    }
    
    if (!formData.responseStyle.trim()) {
      errors.push("Response style is required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [formData]);

  return {
    formData,
    updateField,
    addPersonalityTrait,
    removePersonalityTrait,
    resetForm,
    validateForm,
  };
}
