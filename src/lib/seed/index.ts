import type { Database } from "@/types";
import { SEED_ATTEMPTS } from "./attempts";
import { SEED_PAYMENTS, SEED_SETTINGS, SEED_VOUCHERS } from "./commerce";
import { SEED_ACTIVITY_LOGS } from "./logs";
import { SEED_PACKAGES } from "./packages";
import { SEED_QUESTIONS } from "./questions";
import { SEED_SESSIONS } from "./sessions";
import { SEED_CATEGORIES, SEED_CONVERSION_TABLES, SEED_SUBTESTS, SEED_TEST_TYPES } from "./taxonomy";
import { SEED_USERS } from "./users";

export * from "./helpers";
export { SEED_USERS, DEMO_CREDENTIALS } from "./users";
export { SEED_CATEGORIES, SEED_TEST_TYPES, SEED_SUBTESTS, SEED_CONVERSION_TABLES } from "./taxonomy";
export { SEED_QUESTIONS } from "./questions";
export { SEED_PACKAGES } from "./packages";
export { SEED_SESSIONS } from "./sessions";
export { SEED_ATTEMPTS } from "./attempts";
export { SEED_PAYMENTS, SEED_VOUCHERS, SEED_SETTINGS } from "./commerce";
export { SEED_ACTIVITY_LOGS } from "./logs";

/**
 * Bump this when the seed content changes shape or gains data that a persisted
 * copy would otherwise miss (new packages, new attempts, …). Older copies in
 * localStorage are discarded by `migrate` and replaced with the fresh seed.
 *
 * v2 — UTBK + kedinasan packages, UTBK questions, seeded essay attempt.
 */
export const DB_VERSION = 2;

/** Builds a fresh, deterministic clone of the demo database. */
export function createSeedDatabase(): Database {
  return {
    version: DB_VERSION,
    users: structuredCloneSafe(SEED_USERS),
    categories: structuredCloneSafe(SEED_CATEGORIES),
    testTypes: structuredCloneSafe(SEED_TEST_TYPES),
    subtests: structuredCloneSafe(SEED_SUBTESTS),
    conversionTables: structuredCloneSafe(SEED_CONVERSION_TABLES),
    questions: structuredCloneSafe(SEED_QUESTIONS),
    packages: structuredCloneSafe(SEED_PACKAGES),
    sessions: structuredCloneSafe(SEED_SESSIONS),
    attempts: structuredCloneSafe(SEED_ATTEMPTS),
    payments: structuredCloneSafe(SEED_PAYMENTS),
    vouchers: structuredCloneSafe(SEED_VOUCHERS),
    settings: structuredCloneSafe(SEED_SETTINGS),
    activityLogs: structuredCloneSafe(SEED_ACTIVITY_LOGS),
  };
}

function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
