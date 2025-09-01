export type DocumentType = 'file' | 'website';

export type Document = {
  id: string;
  name: string;
  filePath: string | null;
  url: string | null;
  type: DocumentType;
  locationId: string;
  size: number | null;
  created: Date;
};

export type DocumentMetadata = {
  id: string;
  documentId: string;
  metadata: Record<string, any>;
  created: Date;
};

export type DocumentChunk = {
  id: string;
  documentId: string;
  content: string;
  embedding?: string;
};