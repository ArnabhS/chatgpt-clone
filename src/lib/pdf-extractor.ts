import PDFParser from 'pdf2json';
import fs from 'fs';

// Basic type definitions for pdf2json
interface ParserError {
  parserError: string;
}

type PDFParserCallback = (data: ParserError | void) => void;

class PDFParserClass {
  constructor(container: null, storeDataInCallback: number) {}
  on(event: 'pdfParser_dataError' | 'pdfParser_dataReady', callback: PDFParserCallback): void {}
  loadPDF(filePath: string): void {}
  getRawTextContent(): string { return ''; }
}

export async function extractTextFromPDF(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      console.log('Reading PDF from:', filePath);
      // Verify file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`PDF file not found at path: ${filePath}`);
      }

      // Create a new PDF parser instance
      const pdfParser = new (PDFParser as unknown as typeof PDFParserClass)(null, 1);

      // Handle parsing errors
      pdfParser.on('pdfParser_dataError', (errData: ParserError) => {
        console.error('PDF parsing error:', errData.parserError);
        reject(new Error(errData.parserError));
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