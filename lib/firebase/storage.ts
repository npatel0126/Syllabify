import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "./config";

export async function uploadPDF(
  file: File,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<{ downloadUrl: string; storagePath: string }> {
  // TODO: implement upload with progress callback.
  // For now, return placeholder values.
  const storagePath = `users/${userId}/syllabi/${file.name}`;
  const downloadUrl = "";
  onProgress?.(100);
  return { downloadUrl, storagePath };
}

// NOTE: We intentionally import Firebase Storage primitives so the implementation can
// be filled in later without restructuring the file.
export { ref, uploadBytesResumable, getDownloadURL };

