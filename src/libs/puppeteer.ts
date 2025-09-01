import { generatePDFBufferReactPDF } from './react-pdf-generator';
import type { Contract } from '@/types/contract';
import * as cheerio from 'cheerio';

// Legacy interface to maintain compatibility with existing code
// This function now converts HTML to a contract-like structure and uses react-pdf
export async function generatePDFBuffer(html: string): Promise<Uint8Array> {
  // Parse the HTML to extract title and content
  const $ = cheerio.load(html);
  const title = $('title').text() || 'Document';
  const bodyContent = $('body').html() || '';
  
  // Create a contract-like structure from the HTML
  const mockContract: Contract = {
    id: 'temp',
    locationId: 'temp',
    content: bodyContent,
    title: title,
    description: 'Generated document',
    created: new Date(),
    updated: null,
    isDraft: false,
    editable: false,
    requireSignature: false,
    type: 'contract' as any,
  };
  
  // Since the HTML might already have interpolated variables, we pass empty variables
  return generatePDFBufferReactPDF(mockContract, {});
}