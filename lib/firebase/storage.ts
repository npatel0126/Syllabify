import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/config";

export async function uploadPDF(
  file: File,
  userId: string,
  syllabusId: string,
  onProgress?: (progressPercent: number) => void
): Promise<{ downloadUrl: string; storagePath: string }> {
  // Use syllabusId as the filename so the Cloud Function trigger can match
  // the Firestore doc without a lookup, and to avoid name collisions.
  const storagePath = `users/${userId}/syllabi/${syllabusId}.pdf`;
  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: "application/pdf",
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const percent = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress?.(percent);
      },
      (error) => reject(error),
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({ downloadUrl, storagePath });
      }
    );
  });
}

