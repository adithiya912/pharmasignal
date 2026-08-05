import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "PharmaSignal — AI-powered pharmacovigilance",
  description:
    "Patients report side effects, AI extracts entities and predicts drug interactions, and doctors and regulators get explainable, evidence-backed risk scores.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
        style={
          {
            "--font-body": "var(--font-geist-sans)",
            "--font-data": "var(--font-geist-mono)",
          } as React.CSSProperties
        }
      >
        <body className="min-h-full flex flex-col bg-background text-foreground font-body">
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
            <QueryProvider>
              <TooltipProvider>
                {children}
                <Toaster />
              </TooltipProvider>
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
