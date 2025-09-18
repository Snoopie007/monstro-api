"use client";

import React, { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "@/components/ui";
import { Label, Textarea } from "@/components/forms";
import { X, Plus } from "lucide-react";
import { QAEntry } from "@/types/knowledgeBase";
import { SupportSettingsSchema } from "@/libs/FormSchemas/SupportSettingsSchema";

interface QAEntryFormProps {
  form: UseFormReturn<z.infer<typeof SupportSettingsSchema>>;
  onSubmit: (entry: { question: string; answer: string }) => void;
  onCancel: () => void;
  initialData?: QAEntry | null;
  isSubmitting?: boolean;
}

export function QAEntryForm({
  form,
  onSubmit,
  onCancel,
  initialData,
  isSubmitting = false,
}: QAEntryFormProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [errors, setErrors] = useState<{ question?: string; answer?: string }>(
    {}
  );

  useEffect(() => {
    if (initialData) {
      setQuestion(initialData.question);
      setAnswer(initialData.answer);
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors: { question?: string; answer?: string } = {};
    if (!question.trim()) {
      newErrors.question = "Question is required";
    } else if (question.trim().length < 4) {
      newErrors.question = "Question must be at least 4 characters";
    }

    if (!answer.trim()) {
      newErrors.answer = "Answer is required";
    } else if (answer.trim().length < 4) {
      newErrors.answer = "Answer must be at least 4 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const currentEntries = form.getValues("knowledgeBase.qa_entries") || [];
    const newEntry = {
      id: initialData?.id || crypto.randomUUID(),
      question: question.trim(),
      answer: answer.trim(),
      created: initialData?.created || new Date().toISOString(),
    };

    let updatedEntries;
    if (initialData) {
      // Update existing entry
      updatedEntries = currentEntries.map((entry) =>
        entry.id === initialData.id ? newEntry : entry
      );
    } else {
      // Add new entry
      updatedEntries = [...currentEntries, newEntry];
    }

    form.setValue("knowledgeBase.qa_entries", updatedEntries);

    // Call the onSubmit callback if needed for additional logic
    onSubmit({
      question: question.trim(),
      answer: answer.trim(),
    });
  };

  const handleReset = () => {
    setQuestion("");
    setAnswer("");
    setErrors({});
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="question" size="tiny">Question</Label>
        <Textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Enter the question that customers might ask..."
          className={`min-h-[100px] ${errors.question ? "border-red-500" : ""
            }`}
          disabled={isSubmitting}
        />
        {errors.question && (
          <p className="text-sm text-red-500">{errors.question}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Examples: "What are your operating hours?", "How do I cancel my
          membership?"
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="answer" size="tiny">Answer</Label>
        <Textarea
          id="answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter the detailed answer to provide to customers..."
          className={`min-h-[120px] ${errors.answer ? "border-red-500" : ""}`}
          disabled={isSubmitting}
        />
        {errors.answer && (
          <p className="text-sm text-red-500">{errors.answer}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Provide a complete, helpful answer that your support bot can use to
          respond to customers.
        </p>
      </div>

      <div className="flex gap-2 pt-2 justify-end">
        <Button type="button" size="sm" onClick={handleSubmit}
          disabled={isSubmitting || !question.trim() || !answer.trim()}
          variant="foreground">
          Save
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={isSubmitting}        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
