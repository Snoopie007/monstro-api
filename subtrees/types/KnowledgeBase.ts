// Knowledge Base types for JSONB storage in support_assistants table

export type QAEntry = {
    id: string;
    question: string;
    answer: string;
    created?: string; // ISO string in JSONB
};

export type DocumentMetadata = {
    id: string;
    name: string;
    file_path: string;
    size: number;
    created: string; // ISO string in JSONB
};

export type KnowledgeBase = {
    qa_entries: QAEntry[];
    document: DocumentMetadata | null;
};

export type DocumentMetadataUI = {
    id: string;
    name: string;
    filePath: string;
    size: number;
    created?: string;
};
