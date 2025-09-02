"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { FileText, Upload, Trash2, Download, ExternalLink } from "lucide-react";
import { SupportBot } from "@/types";

interface DocumentsSectionProps {
  locationId: string;
  supportBot: SupportBot | null;
}

interface SupportDocument {
  id: string;
  name: string;
  type: "file" | "website";
  size?: number;
  url?: string;
  createdAt: Date;
}

export function DocumentsSection({
  locationId,
  supportBot,
}: DocumentsSectionProps) {
  const [documents, setDocuments] = useState<SupportDocument[]>([
    // Placeholder documents for demo
    {
      id: "1",
      name: "Membership Guide.pdf",
      type: "file",
      size: 245760,
      createdAt: new Date(Date.now() - 86400000),
    },
    {
      id: "2",
      name: "Class Schedule Policy",
      type: "website",
      url: "https://example.com/policy",
      createdAt: new Date(Date.now() - 172800000),
    },
  ]);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !supportBot) return;

    setUploading(true);
    try {
      // TODO: Implement file upload API
      // const uploadedDoc = await uploadSupportDocument(supportBot.id, file);
      // setDocuments(prev => [...prev, uploadedDoc]);

      console.log("TODO: Upload document:", file.name);

      // Placeholder - add to local state
      const newDoc: SupportDocument = {
        id: Date.now().toString(),
        name: file.name,
        type: "file",
        size: file.size,
        createdAt: new Date(),
      };

      setDocuments((prev) => [...prev, newDoc]);
    } catch (error) {
      console.error("Failed to upload document:", error);
    } finally {
      setUploading(false);
      // Clear the input
      event.target.value = "";
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      // TODO: Implement document deletion API
      // await deleteSupportDocument(documentId);

      console.log("TODO: Delete document:", documentId);

      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case "file":
        return <FileText size={16} className="text-blue-600" />;
      case "website":
        return <ExternalLink size={16} className="text-green-600" />;
      default:
        return <FileText size={16} className="text-gray-600" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText size={18} />
            Knowledge Base
          </CardTitle>
          <div className="flex gap-2">
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
              style={{ display: "none" }}
              id="file-upload"
              disabled={uploading || !supportBot}
            />
            <Button
              size="sm"
              onClick={() => document.getElementById("file-upload")?.click()}
              disabled={uploading || !supportBot}
              className="gap-2"
            >
              <Upload size={16} />
              {uploading ? "Uploading..." : "Upload Document"}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload PDFs and documents for your support bot to reference when
          answering questions
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>No documents uploaded yet</p>
              <p className="text-sm">
                Upload PDFs to build your knowledge base
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-0.5">
                        {getDocumentIcon(document.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          {document.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              document.type === "file"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-green-50 text-green-700 border-green-200"
                            }`}
                          >
                            {document.type}
                          </Badge>
                          {document.size && (
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(document.size)}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {document.createdAt.toLocaleDateString()}
                          </span>
                        </div>
                        {document.url && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {document.url}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {document.type === "file" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Download size={14} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDocument(document.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
