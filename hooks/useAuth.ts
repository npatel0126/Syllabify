"use client";

import { useCallback } from "react";
import { useFirebaseAuthContext } from "@/lib/firebase/auth-context";
import { signInWithGoogle, signOut as appSignOut } from "@/lib/firebase/auth";

export default function useAuth() {
  const { user, loading } = useFirebaseAuthContext();

  const signIn = useCallback(async () => {
    await signInWithGoogle();
  }, []);

  const signOut = useCallback(async () => {
    await appSignOut();
  }, []);

  return { user, loading, signIn, signOut };
}

