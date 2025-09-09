"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, MessageSquare } from "lucide-react";
import { SupportAssistant } from "@/types";
import { 
  KnowledgeBase, 
  QAEntryUI, 
  // DocumentMetadataUI, // Commented out until document upload is implemented
  convertQAEntryToUI, 
  // convertDocumentToUI // Commented out until document upload is implemented
} from "@/types/knowledgeBase";
import { QAEntryForm } from "./QAEntryForm";
import { QAEntryList } from "./QAEntryList";
// import { SingleDocumentUpload } from "./SingleDocumentUpload"; // Commented out until document upload is implemented

interface DocumentsSectionProps {
  locationId: string;
  supportAssistant: SupportAssistant | null;
  knowledgeBase: KnowledgeBase;
  onKnowledgeBaseUpdate: (updates: Partial<KnowledgeBase>) => Promise<void>;
}

export function DocumentsSection({
  locationId,
  supportAssistant,
  knowledgeBase,
  onKnowledgeBaseUpdate,
}: DocumentsSectionProps) {
  const [showQAForm, setShowQAForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<QAEntryUI | null>(null);
  // const [isUploading, setIsUploading] = useState(false); // Commented out until document upload is implemented
  const [isSubmittingQA, setIsSubmittingQA] = useState(false);

  // Convert JSONB data to UI-friendly format
  const qaEntries = knowledgeBase.qa_entries.map(convertQAEntryToUI);
  // const existingDocument = knowledgeBase.document ? convertDocumentToUI(knowledgeBase.document) : null; // Commented out until document upload is implemented


  // TODO: Document upload handlers - Commented out until text extraction is implemented
  /*
  const handleDocumentUpload = async (file: File) => {
    if (!supportAssistant?.id) return;

    setIsUploading(true);
    try {
      // Call API to upload file and process chunks
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/protected/loc/${locationId}/support/document`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      
      const result = await response.json();
      
      // Update knowledge base with new document metadata
      await onKnowledgeBaseUpdate({
        document: result.documentMetadata
      });
    } catch (error) {
      console.error("Failed to upload document:", error);
      throw error; // Re-throw so component can handle error display
    } finally {
      setIsUploading(false);
    }
  };

  const handleDocumentReplace = async (file: File) => {
    if (!supportAssistant?.id) return;

    setIsUploading(true);
    try {
      // Call API to replace file and process chunks
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/protected/loc/${locationId}/support/document`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) throw new Error('Replace failed');
      
      const result = await response.json();
      
      // Update knowledge base with new document metadata
      await onKnowledgeBaseUpdate({
        document: result.documentMetadata
      });
    } catch (error) {
      console.error("Failed to replace document:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleDocumentDelete = async () => {
    if (!existingDocument) return;

    try {
      const response = await fetch(`/api/protected/loc/${locationId}/support/document`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Delete failed');

      await onKnowledgeBaseUpdate({
        document: null
      });
    } catch (error) {
      console.error("Failed to delete document:", error);
      throw error;
    }
  };
  */

  // Q&A entry handlers
  const handleQASubmit = async (entry: { question: string; answer: string }) => {
    if (!supportAssistant?.id) return;

    setIsSubmittingQA(true);
    try {
      if (editingEntry) {
        // Update existing entry
        const updatedEntries = knowledgeBase.qa_entries.map(existing =>
          existing.id === editingEntry.id 
            ? { ...existing, question: entry.question, answer: entry.answer }
            : existing
        );
        
        await onKnowledgeBaseUpdate({
          qa_entries: updatedEntries
        });
        
        setEditingEntry(null);
      } else {
        // Create new entry
        const newEntry = {
          id: crypto.randomUUID(),
          question: entry.question,
          answer: entry.answer,
          created_at: new Date().toISOString(),
        };
        
        await onKnowledgeBaseUpdate({
          qa_entries: [...knowledgeBase.qa_entries, newEntry]
        });
      }
      
      setShowQAForm(false);
    } catch (error) {
      console.error("Failed to save Q&A entry:", error);
      throw error;
    } finally {
      setIsSubmittingQA(false);
    }
  };

  const handleQAEdit = (entry: QAEntryUI) => {
    setEditingEntry(entry);
    setShowQAForm(true);
  };

  const handleQADelete = async (entryId: string) => {
    try {
      const filteredEntries = knowledgeBase.qa_entries.filter(e => e.id !== entryId);
      await onKnowledgeBaseUpdate({
        qa_entries: filteredEntries
      });
    } catch (error) {
      console.error("Failed to delete Q&A entry:", error);
    }
  };

  const handleQAFormCancel = () => {
    setShowQAForm(false);
    setEditingEntry(null);
  };

  return (
    <div className="space-y-6">
      {/* TODO: Document Upload Section - Commented out until text extraction is implemented */}
      {/* 
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText size={18} />
            <div>
              <CardTitle>Support Document</CardTitle>
              <CardDescription>
                Upload one PDF or document that contains your support information.
                {existingDocument && " You can replace the existing document at any time."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SingleDocumentUpload
            existingDocument={existingDocument}
            onUpload={handleDocumentUpload}
            onReplace={handleDocumentReplace}
            onDelete={handleDocumentDelete}
            isUploading={isUploading}
            supportAssistantId={supportAssistant?.id}
          />
        </CardContent>
      </Card>
      */}

      {/* Q&A Knowledge Base Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} />
              <div>
                <CardTitle>Knowledge Base Q&A</CardTitle>
                <CardDescription>
                  Add specific questions and answers for your support bot's knowledge base.
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={() => setShowQAForm(true)}
              disabled={!supportAssistant}
              className="gap-2"
            >
              <Plus size={16} />
              Add Q&A Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showQAForm && (
            <QAEntryForm
              onSubmit={handleQASubmit}
              onCancel={handleQAFormCancel}
              initialData={editingEntry}
              isSubmitting={isSubmittingQA}
            />
          )}
          <QAEntryList
            entries={qaEntries}
            onEdit={handleQAEdit}
            onDelete={handleQADelete}
            isLoading={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
