import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GlobalProvider } from "@/context/GlobalContext";
import { QueryProvider } from "@/providers/QueryProvider";
import AppLayout from "@/components/layout/AppLayout";
import I18nProvider from "@/components/providers/I18nProvider";
import { Toaster } from "@/components/ui/sonner";
import TaskCenterModal from "@/components/features/TaskCenterModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GAAP Cloud",
  description: "Personal Wealth Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <I18nProvider>
          <QueryProvider>
            <GlobalProvider>
              <AppLayout>
                {children}
              </AppLayout>
              <TaskCenterModal />
              <Toaster />
            </GlobalProvider>
          </QueryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

