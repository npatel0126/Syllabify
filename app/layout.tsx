import "./globals.css";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { FirebaseAuthProvider } from "@/lib/firebase/auth-context";
import Toaster from "@/components/ui/Toast";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Syllabify",
  description: "Upload your syllabus. Never miss a deadline."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[#0A0A0A]">
      <body className={`${dmSans.className} bg-[#0A0A0A] text-text-primary`}>
        <FirebaseAuthProvider>
          {children}
          <Toaster />
        </FirebaseAuthProvider>
      </body>
    </html>
  );
}

