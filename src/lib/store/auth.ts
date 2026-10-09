"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { PublicUser } from "@/types";
import { dataSource, type AuthResult } from "@/lib/repositories";

export const AUTH_STORAGE_KEY = "tryoutku.auth";

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

interface AuthState {
  user: PublicUser | null;
  userId: string | null;
  pending: boolean;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (input: { name: string; email: string; password: string; institution?: string }) => Promise<AuthResult>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      userId: null,
      pending: false,
      hydrated: false,

      async login(email, password) {
        set({ pending: true });
        const result = await dataSource.users.authenticate(email, password);
        set({
          pending: false,
          user: result.ok ? result.user : null,
          userId: result.ok ? result.user.id : null,
        });
        return result;
      },

      async register(input) {
        set({ pending: true });
        const result = await dataSource.users.register(input);
        if (result.ok) {
          const signedIn = await dataSource.users.authenticate(input.email, input.password);
          const user = signedIn.ok ? signedIn.user : result.user;
          set({ user, userId: user.id });
        }
        set({ pending: false });
        return result;
      },

      async logout() {
        set({ user: null, userId: null });
      },

      /** Called after the database has been hydrated, to re-attach the session. */
      async restore() {
        const userId = get().userId;
        set({ hydrated: true });
        if (!userId) return;
        const user = await dataSource.users.get(userId);
        if (user && user.status === "active") {
          const { password: _password, ...rest } = user;
          set({ user: rest });
        } else {
          set({ user: null, userId: null });
        }
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => (typeof window === "undefined" ? noopStorage : window.localStorage)),
      partialize: (state) => ({ userId: state.userId }) as unknown as AuthState,
      skipHydration: true,
      merge: (persisted, current) => ({
        ...current,
        userId: (persisted as { userId?: string | null } | undefined)?.userId ?? null,
      }),
    },
  ),
);

/* ------------------------------ selectors -------------------------------- */

export const useCurrentUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => Boolean(state.user));
export const useAuthPending = () => useAuthStore((state) => state.pending);
