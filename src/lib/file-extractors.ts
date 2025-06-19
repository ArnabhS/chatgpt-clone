import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Pass the buffer directly to pdf-parse
    const data = await pdfParse(buffer, {
      // Ensure we're using the buffer and not trying to read a file
      max: 0, // No page limit
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