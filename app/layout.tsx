import "./globals.css";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { FirebaseAuthProvider } from "@/lib/firebase/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import Toaster from "@/components/ui/Toast";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Syllabify",
  description: "Upload your syllabus. Never miss a deadline.",
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-[#0A0A0A]">
      <body className={`${dmSans.className} bg-[var(--bg-page)] text-[var(--text-1)]`}>
        <ThemeProvider>
          <FirebaseAuthProvider>
            {children}
            <Toaster />
          </FirebaseAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

