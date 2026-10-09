import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { Database } from "@/types";
import { DB_VERSION, createSeedDatabase } from "@/lib/seed";

export const DB_STORAGE_KEY = "tryoutku.db";

/** The store is created on both server and client: the server simply has no storage. */
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

interface DbStore {
  db: Database;
  /** True once the persisted copy has been merged in (client only). */
  hydrated: boolean;
  mutate: (recipe: (db: Database) => Database) => void;
  replace: (db: Database) => void;
  reset: () => void;
  setHydrated: (value: boolean) => void;
}

export const useDbStore = create<DbStore>()(
  persist(
    (set, get) => ({
      db: createSeedDatabase(),
      hydrated: false,
      mutate: (recipe) => set({ db: recipe(get().db) }),
      replace: (db) => set({ db: { ...createSeedDatabase(), ...db } }),
      reset: () => set({ db: createSeedDatabase() }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: DB_STORAGE_KEY,
      version: DB_VERSION,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : window.localStorage,
      ),
      partialize: (state) => ({ db: state.db }) as unknown as DbStore,
      // Hydration is triggered manually from <AppBootstrap /> so the first
      // client render matches the server render.
      skipHydration: true,
      migrate: (persisted, version) => {
        if (version === DB_VERSION) return persisted as DbStore;
        return { db: createSeedDatabase() } as unknown as DbStore;
      },
      merge: (persisted, current) => {
        const incoming = (persisted as { db?: Database })?.db;
        if (!incoming || !Array.isArray(incoming.users) || !Array.isArray(incoming.packages)) {
          return current;
        }
        return { ...current, db: { ...createSeedDatabase(), ...incoming } };
      },
    },
  ),
);

/** Merge localStorage into the store (idempotent). */
export async function hydrateDb() {
  if (useDbStore.getState().hydrated) return;
  try {
    await useDbStore.persist.rehydrate();
  } catch {
    /* storage corrupted — keep the seed */
  }
  useDbStore.getState().setHydrated(true);
}

/* ------------------------------ selectors ------------------------------- */

export const useDatabase = () => useDbStore((state) => state.db);
export const useDbHydrated = () => useDbStore((state) => state.hydrated);
