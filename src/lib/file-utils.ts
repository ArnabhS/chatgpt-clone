import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';


const TEMP_DIR = path.join(os.tmpdir(), 'chatgpt-clone-uploads');


try {
  await fs.access(TEMP_DIR);
} catch {
  await fs.mkdir(TEMP_DIR, { recursive: true });
}

export async function saveTempFile(buffer: Buffer, extension: string): Promise<string> {
  try {
   
    const tempDir = os.tmpdir();
    const fileName = `${uuidv4()}${extension}`;
    const filePath = path.join(tempDir, fileName);

 
    await fs.writeFile(filePath, buffer);
    console.log(`Temporary file saved: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('Error saving temporary file:', error);
    throw error;
  }
}


export async function deleteTempFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
    console.log(`Temporary file deleted: ${filePath}`);
  } catch (error) {
    
    console.error('Error deleting temporary file:', error);
  }
} 