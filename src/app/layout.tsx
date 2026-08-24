import type { Metadata } from "next";
import "./globals.css";
import { GlobalProvider } from "@/context/GlobalContext";
import { QueryProvider } from "@/providers/QueryProvider";
import AppLayout from "@/components/layout/AppLayout";
import I18nProvider from "@/components/providers/I18nProvider";
import { Toaster } from "@/components/ui/sonner";

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
        className="antialiased"
        suppressHydrationWarning
      >
        <I18nProvider>
          <QueryProvider>
            <GlobalProvider>
              <AppLayout>
                {children}
              </AppLayout>
              <Toaster />
            </GlobalProvider>
          </QueryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
