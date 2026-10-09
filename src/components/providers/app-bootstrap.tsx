"use client";

import { useEffect } from "react";
import { hydrateDb } from "@/lib/store/db";
import { useAuthStore } from "@/lib/store/auth";

/**
 * Loads the mock backend (localStorage → Zustand) and re-attaches the persisted
 * session. Runs once, on the client, after hydration so the first client render
 * still matches the server render.
 */
export function AppBootstrap({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await hydrateDb();
      try {
        await useAuthStore.persist.rehydrate();
      } catch {
        /* no persisted session */
      }
      if (cancelled) return;
      await useAuthStore.getState().restore();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <>{children}</>;
}

export default AppBootstrap;
