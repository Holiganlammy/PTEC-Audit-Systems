// app/providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { Provider as ReduxProvider } from "react-redux";
import { ThemeProvider } from "@/components/ThemeProvider";
import { store } from "@/lib/store";
import { CheckSession } from "./CheckSession";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/sonner";
// import { ProgressBar } from "@/components/ProgressBar";
// import { Analytics } from "@/components/Analytics";
import { Suspense } from "react";
import PageLoading from "@/components/PageLoading";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <SessionProvider
          refetchInterval={5 * 60}
          refetchOnWindowFocus={true}
        >
          <ReduxProvider store={store}>
            <Suspense fallback={<PageLoading />}>
              <CheckSession>
                <div id="hero" className="w-full min-h-screen">
                  {children}
                </div>
              </CheckSession>
            </Suspense>
          </ReduxProvider>
        </SessionProvider>

        <Toaster />
      </ThemeProvider>
    </ErrorBoundary>
  );
}