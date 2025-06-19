import PDFParser from 'pdf2json';
import fs from 'fs';

export async function extractTextFromPDF(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      console.log('Reading PDF from:', filePath);
      // Verify file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`PDF file not found at path: ${filePath}`);
      }

      // Create a new PDF parser instance
      const pdfParser = new PDFParser();

      // Handle parsing errors
      pdfParser.on('pdfParser_dataError', (errData: { parserError: Error }) => {
        const errorMsg = errData.parserError instanceof Error ? errData.parserError.message : String(errData.parserError);
        console.error('PDF parsing error:', errorMsg);
        reject(new Error(errorMsg));
      });

      // Handle successful parsing
      pdfParser.on('pdfParser_dataReady', () => {
        console.log('PDF parsed successfully');
        const parsedText = pdfParser.getRawTextContent();
        resolve(parsedText);
      });

      // Load and parse the PDF
      console.log('Loading PDF for parsing...');
      pdfParser.loadPDF(filePath);
    } catch (error) {
      console.error('Error in extractTextFromPDF:', error);
      reject(error);
    }
  });
} 