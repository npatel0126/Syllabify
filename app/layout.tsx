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
    <html lang="en" className="dark">
      <head>
        {/* Inline script runs before paint — avoids flash on theme load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('syllabify-theme');if(t==='light'){document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${dmSans.className}`}>
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

