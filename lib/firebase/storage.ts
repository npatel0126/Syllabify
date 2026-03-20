import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/config";

export async function uploadPDF(
  file: File,
  userId: string,
  onProgress?: (progressPercent: number) => void
): Promise<{ downloadUrl: string; storagePath: string }> {
  // TODO: Implement Storage upload + progress reporting.
  // Return placeholders for scaffolding.
  if (onProgress) onProgress(0);
  const storagePath = `users/${userId}/syllabi/${file.name}`;
  if (onProgress) onProgress(100);
  return { downloadUrl: "", storagePath };
}

export const _storageScaffold = { ref, uploadBytesResumable, getDownloadURL };

