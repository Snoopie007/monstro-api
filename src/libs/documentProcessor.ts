// Document processing utilities for knowledge base

export interface DocumentChunk {
  content: string;
  index: number;
}

/**
 * Split text into chunks with overlap for better context preservation
 */
export function chunkText(
  text: string,
  options: {
    maxChunkSize?: number;
    overlap?: number;
    minChunkSize?: number;
  } = {}
): DocumentChunk[] {
  const {
    maxChunkSize = 1000,
    overlap = 200,
    minChunkSize = 100,
  } = options;

  const chunks: DocumentChunk[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    const potentialChunk = currentChunk + (currentChunk ? '. ' : '') + trimmedSentence;

    if (potentialChunk.length <= maxChunkSize) {
      currentChunk = potentialChunk;
    } else {
      // Save current chunk if it meets minimum size
      if (currentChunk.length >= minChunkSize) {
        chunks.push({
          content: currentChunk.trim(),
          index: chunkIndex++,
        });

        // Start new chunk with overlap
        const words = currentChunk.split(' ');
        const overlapWords = Math.min(overlap / 5, words.length); // Rough estimate
        currentChunk = words.slice(-overlapWords).join(' ') + '. ' + trimmedSentence;
      } else {
        currentChunk = trimmedSentence;
      }
    }
  }

  // Add final chunk
  if (currentChunk.length >= minChunkSize) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
    });
  }

  return chunks;
}

/**
 * Extract text from different file types
 * This is a placeholder - in real implementation, you'd use libraries like:
 * - pdf-parse for PDFs
 * - mammoth for DOCX
 * - Built-in TextDecoder for plain text
 * 
 * TODO: Commented out until text extraction is implemented
 */
/*
export async function extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
  // TODO: Implement actual text extraction based on file type
  console.log(`Extracting text from ${filePath} (${mimeType})`);
  
  // Placeholder implementation
  switch (mimeType) {
    case 'application/pdf':
      return extractTextFromPDF(filePath);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractTextFromDOCX(filePath);
    case 'application/msword':
      return extractTextFromDOC(filePath);
    case 'text/plain':
      return extractTextFromTXT(filePath);
    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}
*/

// TODO: Commented out until text extraction is implemented
/*
async function extractTextFromPDF(filePath: string): Promise<string> {
  // TODO: Use pdf-parse library
  // const pdfParse = require('pdf-parse');
  // const dataBuffer = fs.readFileSync(filePath);
  // const data = await pdfParse(dataBuffer);
  // return data.text;
  
  return `Extracted text from PDF: ${filePath}`;
}

async function extractTextFromDOCX(filePath: string): Promise<string> {
  // TODO: Use mammoth library
  // const mammoth = require('mammoth');
  // const result = await mammoth.extractRawText({ path: filePath });
  // return result.value;
  
  return `Extracted text from DOCX: ${filePath}`;
}

async function extractTextFromDOC(filePath: string): Promise<string> {
  // TODO: Use textract or similar library
  return `Extracted text from DOC: ${filePath}`;
}

async function extractTextFromTXT(filePath: string): Promise<string> {
  // TODO: Read file using fs
  // const fs = require('fs');
  // return fs.readFileSync(filePath, 'utf8');
  
  return `Extracted text from TXT: ${filePath}`;
}
*/

/**
 * Generate embeddings for text chunks
 * This is a placeholder - in real implementation, you'd use:
 * - OpenAI Embeddings API
 * - Local models like sentence-transformers
 * - Other embedding services
 * 
 * TODO: Commented out until text extraction is implemented
 */
/*
export async function generateEmbedding(text: string): Promise<number[]> {
  // TODO: Implement actual embedding generation
  console.log(`Generating embedding for text: ${text.substring(0, 50)}...`);
  
  // Placeholder: return random vector of 384 dimensions
  return Array.from({ length: 384 }, () => Math.random() - 0.5);
}
*/

/**
 * Validate document content and size
 * TODO: Commented out until text extraction is implemented
 */
/*
export function validateDocument(file: File): { isValid: boolean; error?: string } {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'
    };
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size too large. Maximum size is 10MB.'
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      error: 'File is empty.'
    };
  }

  return { isValid: true };
}
*/
