import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    
    const data = await pdfParse(buffer, {
    
      max: 0, 
    });
    return data.text;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw error;
  }
}

export async function extractTextFromDoc(buffer: Buffer): Promise<string> {
  try {
    // Pass the buffer directly to mammoth
    const result = await mammoth.extractRawText({
      buffer: buffer,  // Explicitly pass as buffer
    });
    return result.value;
  } catch (error) {
    console.error('Error extracting DOC text:', error);
    throw error;
  }
} 