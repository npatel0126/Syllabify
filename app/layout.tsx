import "./globals.css";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import FirebaseAuthProvider from "@/lib/firebase/auth-context";
import Toaster from "@/components/ui/Toast";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Syllabify",
  description: "AI-powered syllabus parser"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={dmSans.className}>
        <FirebaseAuthProvider>
          {children}
          <Toaster />
        </FirebaseAuthProvider>
      </body>
    </html>
  );
}

