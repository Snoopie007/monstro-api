// TODO: Document upload API routes commented out until text extraction is implemented
// This file contains placeholder API routes for document upload functionality
// Uncomment and implement when ready to add document processing capabilities

/*
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { supportAssistants, supportDocumentChunks } from "@/db/schemas";
import { KnowledgeBase, DocumentMetadata } from "@/types/knowledgeBase";
import { 
  chunkText, 
  extractTextFromFile, 
  generateEmbedding, 
  validateDocument 
} from "@/libs/documentProcessor";
import S3Bucket from "@/libs/server/s3";

const s3 = new S3Bucket();

// TODO: Helper function to process document into chunks - Commented out until text extraction is implemented
/*
async function processDocumentIntoChunks(
  supportAssistantId: string,
  filePath: string,
  fileName: string,
  mimeType: string
): Promise<void> {
  console.log(`Processing document: ${fileName} for assistant: ${supportAssistantId}`);
  
  try {
    // Extract text from document
    const documentText = await extractTextFromFile(filePath, mimeType);
    
    // Split text into chunks
    const textChunks = chunkText(documentText, {
      maxChunkSize: 1000,
      overlap: 200,
      minChunkSize: 100
    });

    // Generate embeddings and prepare chunk records
    const chunkRecords = await Promise.all(
      textChunks.map(async (chunk) => {
        const embedding = await generateEmbedding(chunk.content);
        
        return {
          supportAssistantId,
          content: chunk.content,
          chunkIndex: chunk.index,
          embedding, // Note: This requires vector support in your DB
        };
      })
    );

    // Insert chunks into database
    if (chunkRecords.length > 0) {
      await db.insert(supportDocumentChunks).values(chunkRecords);
    }
    
    console.log(`Successfully processed ${chunkRecords.length} chunks for ${fileName}`);
  } catch (error) {
    console.error(`Error processing document ${fileName}:`, error);
    throw error;
  }
}
*/

// TODO: Document upload functionality commented out until text extraction is implemented
/*
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the uploaded file
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Find existing support assistant
    const existingAssistant = await db.query.supportAssistants.findFirst({
      where: eq(supportAssistants.locationId, params.id),
    });

    if (!existingAssistant) {
      return NextResponse.json(
        { error: "Support assistant not found" },
        { status: 404 }
      );
    }

    // Check if assistant already has a document
    const currentKnowledgeBase = existingAssistant.knowledgeBase as KnowledgeBase || { qa_entries: [], document: null };
    if (currentKnowledgeBase.document) {
      return NextResponse.json(
        { error: "Support assistant already has a document. Use PUT to replace it." },
        { status: 409 }
      );
    }

    // Upload file to storage\
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = `uploads/support_docs/${params.id}/${file.name}`;
    const uploadRes = await s3.uploadBuffer(buffer, filePath, file.type);

    // Create document metadata
    const documentMetadata: DocumentMetadata = {
      id: crypto.randomUUID(),
      name: file.name,
      file_path: uploadRes.url,
      size: file.size,
      created_at: new Date().toISOString(),
    };

    // Update knowledge base with new document
    const updatedKnowledgeBase: KnowledgeBase = {
      ...currentKnowledgeBase,
      document: documentMetadata
    };

    // Update support assistant with new document metadata
    await db
      .update(supportAssistants)
      .set({
        knowledgeBase: updatedKnowledgeBase,
        updatedAt: new Date(),
      })
      .where(eq(supportAssistants.id, existingAssistant.id));

    // Process document into chunks for RAG
    await processDocumentIntoChunks(existingAssistant.id, filePath, file.name, file.type);

    return NextResponse.json({
      documentMetadata,
      message: "Document uploaded and processed successfully",
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the uploaded file
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Find existing support assistant
    const existingAssistant = await db.query.supportAssistants.findFirst({
      where: eq(supportAssistants.locationId, params.id),
    });

    if (!existingAssistant) {
      return NextResponse.json(
        { error: "Support assistant not found" },
        { status: 404 }
      );
    }

    // Delete existing document chunks
    await db.delete(supportDocumentChunks)
      .where(eq(supportDocumentChunks.supportAssistantId, existingAssistant.id));

    // Upload new file to storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = `uploads/support_docs/${params.id}/${file.name}`;
    const uploadRes = await s3.uploadBuffer(buffer, filePath, file.type);

    // Create new document metadata
    const documentMetadata: DocumentMetadata = {
      id: crypto.randomUUID(),
      name: file.name,
      file_path: uploadRes.url,
      size: file.size,
      created_at: new Date().toISOString(),
    };

    // Update knowledge base with new document
    const currentKnowledgeBase = existingAssistant.knowledgeBase as KnowledgeBase || { qa_entries: [], document: null };
    const updatedKnowledgeBase: KnowledgeBase = {
      ...currentKnowledgeBase,
      document: documentMetadata
    };

    // Update support assistant with new document metadata
    await db
      .update(supportAssistants)
      .set({
        knowledgeBase: updatedKnowledgeBase,
        updatedAt: new Date(),
      })
      .where(eq(supportAssistants.id, existingAssistant.id));

    // Process new document into chunks for RAG
    await processDocumentIntoChunks(existingAssistant.id, filePath, file.name, file.type);

    return NextResponse.json({
      documentMetadata,
      message: "Document replaced and processed successfully",
    });
  } catch (error) {
    console.error("Error replacing document:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find existing support assistant
    const existingAssistant = await db.query.supportAssistants.findFirst({
      where: eq(supportAssistants.locationId, params.id),
    });

    if (!existingAssistant) {
      return NextResponse.json(
        { error: "Support assistant not found" },
        { status: 404 }
      );
    }

    // Delete document chunks
    await db.delete(supportDocumentChunks)
      .where(eq(supportDocumentChunks.supportAssistantId, existingAssistant.id));

    // Update knowledge base to remove document
    const currentKnowledgeBase = existingAssistant.knowledgeBase as KnowledgeBase || { qa_entries: [], document: null };
    const updatedKnowledgeBase: KnowledgeBase = {
      ...currentKnowledgeBase,
      document: null
    };

    // Update support assistant
    await db
      .update(supportAssistants)
      .set({
        knowledgeBase: updatedKnowledgeBase,
        updatedAt: new Date(),
      })
      .where(eq(supportAssistants.id, existingAssistant.id));

    // TODO: Delete actual file from storage
    // await deleteFileFromStorage(currentKnowledgeBase.document?.file_path);

    return NextResponse.json({
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
*/



// Placeholder exports to make this a valid module until document processing is implemented
// For resolving build error
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Document upload functionality not yet implemented" },
    { status: 501 }
  );
}