"use client";

import { useMemo } from "react";
import type { Attempt, Payment, TryoutPackage } from "@/types";
import { useCurrentUser } from "@/lib/store/auth";
import { useDatabase } from "@/lib/store/db";

export type AccessState =
  /** Free or already paid in full — everything is unlocked. */
  | "open"
  /** Freemium: playable, but the detailed result & discussion are locked. */
  | "freemium-locked"
  /** Paid package without an approved payment yet. */
  | "locked"
  /** Payment uploaded, waiting for admin verification. */
  | "pending"
  /** Payment rejected — must re-upload proof. */
  | "rejected";

export interface PackageAccess {
  state: AccessState;
  /** Can the participant start (or resume) the tryout? */
  canStart: boolean;
  /** Are detailed results & the discussion unlocked? */
  discussionUnlocked: boolean;
  activeAttempt?: Attempt;
  lastAttempt?: Attempt;
  payment?: Payment;
}

function resolveAccess(
  pkg: TryoutPackage,
  attempts: Attempt[],
  payments: Payment[],
): PackageAccess {
  const packageAttempts = attempts
    .filter((attempt) => attempt.packageId === pkg.id)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const activeAttempt = packageAttempts.find((attempt) => attempt.status === "in-progress");
  const lastAttempt = packageAttempts[0];
  const payment = payments
    .filter((item) => item.packageId === pkg.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const paid = payment?.status === "approved";
  const pending = payment?.status === "pending";
  const rejected = payment?.status === "rejected";

  if (pkg.pricingModel === "free") {
    return { state: "open", canStart: true, discussionUnlocked: true, activeAttempt, lastAttempt, payment };
  }

  if (paid) {
    return { state: "open", canStart: true, discussionUnlocked: true, activeAttempt, lastAttempt, payment };
  }

  if (pending) {
    return {
      state: "pending",
      canStart: pkg.pricingModel === "freemium",
      discussionUnlocked: false,
      activeAttempt,
      lastAttempt,
      payment,
    };
  }

  if (rejected) {
    return {
      state: "rejected",
      canStart: pkg.pricingModel === "freemium",
      discussionUnlocked: false,
      activeAttempt,
      lastAttempt,
      payment,
    };
  }

  return {
    state: pkg.pricingModel === "freemium" ? "freemium-locked" : "locked",
    canStart: pkg.pricingModel === "freemium",
    discussionUnlocked: false,
    activeAttempt,
    lastAttempt,
    payment,
  };
}

function emptyAccess(): PackageAccess {
  return { state: "locked", canStart: false, discussionUnlocked: false };
}

/** Access state for a single package. */
export function usePackageAccess(packageId: string): PackageAccess {
  const user = useCurrentUser();
  const db = useDatabase();

  return useMemo(() => {
    if (!user || !packageId) return emptyAccess();
    const pkg = db.packages.find((item) => item.id === packageId);
    if (!pkg) return emptyAccess();
    const attempts = db.attempts.filter((attempt) => attempt.userId === user.id);
    const payments = db.payments.filter((payment) => payment.userId === user.id);
    return resolveAccess(pkg, attempts, payments);
  }, [db, user, packageId]);
}

/** Access state for every package, keyed by package id. */
export function usePackageAccessMap(): Record<string, PackageAccess> {
  const user = useCurrentUser();
  const db = useDatabase();

  return useMemo(() => {
    const map: Record<string, PackageAccess> = {};
    if (!user) return map;
    const attempts = db.attempts.filter((attempt) => attempt.userId === user.id);
    const payments = db.payments.filter((payment) => payment.userId === user.id);
    for (const pkg of db.packages) {
      map[pkg.id] = resolveAccess(pkg, attempts, payments);
    }
    return map;
  }, [db, user]);
}
