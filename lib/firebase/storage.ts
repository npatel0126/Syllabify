import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/config";

export async function uploadPDF(
  file: File,
  userId: string,
  onProgress?: (progressPercent: number) => void
): Promise<{ downloadUrl: string; storagePath: string }> {
  const storagePath = `users/${userId}/syllabi/${file.name}`;
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

