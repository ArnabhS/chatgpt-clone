import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Create a temporary directory for file uploads if it doesn't exist
const TEMP_DIR = path.join(os.tmpdir(), 'chatgpt-clone-uploads');

// Ensure temp directory exists
try {
  await fs.access(TEMP_DIR);
} catch {
  await fs.mkdir(TEMP_DIR, { recursive: true });
}

/**
 * Save a buffer to a temporary file with the given extension
 * @param buffer The buffer to save
 * @param extension The file extension (including the dot)
 * @returns The path to the temporary file
 */
export async function saveTempFile(buffer: Buffer, extension: string): Promise<string> {
  try {
    // Generate a unique filename with the given extension
    const tempDir = os.tmpdir();
    const fileName = `${uuidv4()}${extension}`;
    const filePath = path.join(tempDir, fileName);

    // Write the buffer to the temporary file
    await fs.writeFile(filePath, buffer);
    console.log(`Temporary file saved: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('Error saving temporary file:', error);
    throw error;
  }
}

/**
 * Delete a temporary file
 * @param filePath The path to the temporary file
 */
export async function deleteTempFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
    console.log(`Temporary file deleted: ${filePath}`);
  } catch (error) {
    // Log but don't throw - we don't want cleanup failures to affect the main flow
    console.error('Error deleting temporary file:', error);
  }
} 