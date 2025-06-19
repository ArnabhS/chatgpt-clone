import PDFParser from 'pdf2json';
import fs from 'fs';



export async function extractTextFromPDF(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      console.log('Reading PDF from:', filePath);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`PDF file not found at path: ${filePath}`);
      }

      const pdfParser = new PDFParser(null, true);

     
      pdfParser.on('pdfParser_dataError', (errData: { parserError: Error }) => {
        const errorMsg = errData.parserError instanceof Error ? errData.parserError.message : String(errData.parserError);
        console.error('PDF parsing error:', errorMsg);
        reject(new Error(errorMsg));
      });

    
      pdfParser.on('pdfParser_dataReady', () => {
        console.log('PDF parsed successfully');
        const parsedText = pdfParser.getRawTextContent();
        console.log('getRawTextContent output:', parsedText);
        resolve(parsedText);
      });

      
      console.log('Loading PDF for parsing...');
      pdfParser.loadPDF(filePath);
    } catch (error) {
      console.error('Error in extractTextFromPDF:', error);
      reject(error);
    }
  });
} 