import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User as FirebaseUser
} from "firebase/auth";
import { auth } from "./config";

export async function signInWithGoogle(): Promise<void> {
  // TODO: decide whether to use `signInWithPopup` or custom redirect flow.
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

export async function signOut(): Promise<void> {
  await signOut(auth);
}

export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}

