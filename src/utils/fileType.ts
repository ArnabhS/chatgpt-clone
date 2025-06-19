
export function getFileType(mime: string): 'image' | 'pdf' | 'docx' | 'txt' | 'unsupported' {
    if (mime.startsWith('image/')) return 'image';
    if (mime === 'application/pdf') return 'pdf';
    if (
      mime === 'application/msword' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) return 'docx';
    if (mime === 'text/plain') return 'txt';
    return 'unsupported';
  }
  