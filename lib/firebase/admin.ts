/**
 * lib/firebase/admin.ts
 * Server-only Firebase Admin SDK initialisation.
 * Import this in API routes / Server Actions — never in client components.
 */
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getAuth } from "firebase-admin/auth";

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  // In production supply FIREBASE_SERVICE_ACCOUNT_KEY (JSON string) in env.
  // In emulator mode the SDK auto-connects when FIREBASE_EMULATOR_HOST is set.
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  // Only use the service account if the value looks like real JSON (starts with '{').
  if (serviceAccountJson && serviceAccountJson.trimStart().startsWith("{")) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }

  // Emulator / CI: use application default credentials.
  return initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const adminApp = getAdminApp();

export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
export const adminAuth = getAuth(adminApp);
