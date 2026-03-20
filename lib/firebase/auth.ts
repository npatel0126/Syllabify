import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import type { User } from "@/types";

export async function signInWithGoogle(): Promise<void> {
  // TODO: Implement popup sign-in and persist auth state.
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function getCurrentUser(): User | null {
  // TODO: Map Firebase User -> our User type.
  // For scaffolding, return null.
  return null;
}

