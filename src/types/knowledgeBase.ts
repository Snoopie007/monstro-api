// Knowledge Base types for JSONB storage in support_assistants table

export type QAEntry = {
  id: string;
  question: string;
  answer: string;
  created_at: string; // ISO string in JSONB
};

export type DocumentMetadata = {
  id: string;
  name: string;
  file_path: string;
  size: number;
  created_at: string; // ISO string in JSONB
};

export type KnowledgeBase = {
  qa_entries: QAEntry[];
  document: DocumentMetadata | null;
};

// For frontend components (with Date objects)
export type QAEntryUI = {
  id: string;
  question: string;
  answer: string;
  createdAt: Date;
};

export type DocumentMetadataUI = {
  id: string;
  name: string;
  filePath: string;
  size: number;
  createdAt: Date;
};

// Utility functions to convert between JSONB and UI types
export const convertQAEntryToUI = (entry: QAEntry): QAEntryUI => ({
  id: entry.id,
  question: entry.question,
  answer: entry.answer,
  createdAt: new Date(entry.created_at),
});

export const convertQAEntryFromUI = (entry: Omit<QAEntryUI, 'id' | 'createdAt'>): Omit<QAEntry, 'id' | 'created_at'> => ({
  question: entry.question,
  answer: entry.answer,
});

export const convertDocumentToUI = (doc: DocumentMetadata): DocumentMetadataUI => ({
  id: doc.id,
  name: doc.name,
  filePath: doc.file_path,
  size: doc.size,
  createdAt: new Date(doc.created_at),
});

export const convertDocumentFromUI = (doc: Omit<DocumentMetadataUI, 'id' | 'createdAt'>): Omit<DocumentMetadata, 'id' | 'created_at'> => ({
  name: doc.name,
  file_path: doc.filePath,
  size: doc.size,
});
