"use client";

import { SessionProvider } from "next-auth/react";
import { OfflineBanner } from "./OfflineBanner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <OfflineBanner />
      {children}
    </SessionProvider>
  );
}
