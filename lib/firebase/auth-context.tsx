"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import type { User as AppUser } from "@/types";

type FirebaseAuthContextValue = {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
};

const FirebaseAuthContext = createContext<FirebaseAuthContextValue | undefined>(undefined);

export default function FirebaseAuthProvider({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const user = useMemo<AppUser | null>(() => {
    // TODO: Hydrate app-level user profile from Firestore.
    // For scaffolding, map Firebase user -> null.
    return null;
  }, [firebaseUser]);

  const value = useMemo<FirebaseAuthContextValue>(
    () => ({
      user,
      firebaseUser,
      loading
    }),
    [user, firebaseUser, loading]
  );

  return <FirebaseAuthContext.Provider value={value}>{children}</FirebaseAuthContext.Provider>;
}

export function useFirebaseAuthContext() {
  const ctx = useContext(FirebaseAuthContext);
  if (!ctx) throw new Error("useFirebaseAuthContext must be used within FirebaseAuthProvider");
  return ctx;
}

