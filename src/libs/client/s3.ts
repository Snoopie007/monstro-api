/**
 * Client-side S3 upload with progress tracking using XHR.
 * Uses presigned URLs from the API for direct-to-S3 uploads.
 * 
 * @param file - The File or Blob to upload
 * @param uploadUrl - Presigned S3 URL from the API
 * @param onProgress - Optional callback receiving progress percentage (0-100)
 * @returns Promise that resolves when upload completes
 */
export async function uploadToS3(
  file: File | Blob,
  uploadUrl: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

