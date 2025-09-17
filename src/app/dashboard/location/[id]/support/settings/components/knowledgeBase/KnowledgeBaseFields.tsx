import { FormLabel } from "@/components/forms";
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui";
import { SupportSettingsSchema } from "@/libs/FormSchemas";
import { InfoIcon, Plus, X } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { QAEntry } from "@/types/knowledgeBase";
import { QAEntryForm } from "./QAEntryForm";
import { QAEntryList } from "./QAEntryList";

interface KnowledgeBaseFieldsProps {
  form: UseFormReturn<z.infer<typeof SupportSettingsSchema>>;
}

export function KnowledgeBaseFields({ form }: KnowledgeBaseFieldsProps) {
  const qaEntries = form.watch("knowledgeBase").qa_entries;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<QAEntry | null>(null);
  const [isSubmittingQA, setIsSubmittingQA] = useState(false);

  const handleQASubmit = async (entry: {
    question: string;
    answer: string;
  }) => {
    setIsModalOpen(false);
    setEditingEntry(null);
    setIsSubmittingQA(false);

    await form.trigger("knowledgeBase.qa_entries");
  };

  const handleQAEdit = (entry: QAEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleQADelete = async (entryId: string) => {
    const currentEntries = form.getValues("knowledgeBase.qa_entries") || [];
    const updatedEntries = currentEntries.filter(
      (entry) => entry.id !== entryId
    );
    form.setValue("knowledgeBase.qa_entries", updatedEntries);

    await form.trigger("knowledgeBase.qa_entries");
  };

  const handleQAFormCancel = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  const handleAddNew = () => {
    setEditingEntry(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4 bg-foreground/5 rounded-md p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FormLabel size="sm">Knowledge Base</FormLabel>
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon size={16} className="text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              Add specific questions and answers for your support bot's
              knowledge base.
            </TooltipContent>
          </Tooltip>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              type="button"
              variant="ghost"
              onClick={handleAddNew}
              className="gap-2 hover:bg-foreground/10"
            >
              <Plus size={16} />
              Add Q&A Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>
                  {editingEntry ? "Edit Q&A Entry" : "Add New Q&A Entry"}
                </DialogTitle>
                <DialogClose asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleQAFormCancel}
                  >
                    <X size={16} />
                  </Button>
                </DialogClose>
              </div>
            </DialogHeader>
            <QAEntryForm
              form={form}
              onSubmit={handleQASubmit}
              onCancel={handleQAFormCancel}
              initialData={editingEntry}
              isSubmitting={isSubmittingQA}
            />
          </DialogContent>
        </Dialog>
      </div>
      <QAEntryList
        entries={qaEntries}
        onEdit={handleQAEdit}
        onDelete={handleQADelete}
        isLoading={false}
      />
    </div>
  );
}
