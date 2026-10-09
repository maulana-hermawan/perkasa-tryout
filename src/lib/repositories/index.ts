/**
 * Single entry point for data access.
 *
 * Components and hooks import `dataSource` (never the store directly for
 * mutations) so swapping the mock backend for Supabase/Firebase is a one-line
 * change here.
 */
import type { DataSource } from "./types";
import { localDataSource } from "./local";

export * from "./types";

export const dataSource: DataSource = localDataSource;
