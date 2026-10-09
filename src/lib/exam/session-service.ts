import type { Session, SessionMode, SessionParticipant } from "@/types";
import { dataSource } from "@/lib/repositories";
import { generateJoinCode, uid } from "@/lib/utils";

/**
 * Host-side session helpers (Wayground/Quizizz style).
 *
 * The mock backend keeps everything in localStorage, so "live" means: every
 * participant in the same browser sees the same session. Swapping in a realtime
 * backend only requires replacing `dataSource.sessions`.
 */

const CODE_LENGTH = 6;
const CODE_ATTEMPTS = 12;

/** Creates a session with a fresh 6-digit code that is not in use yet. */
export async function createSession(input: {
  packageId: string;
  hostId: string;
  title: string;
  mode: SessionMode;
  leaderboard: boolean;
  showResultsImmediately: boolean;
  requireLogin: boolean;
  maxParticipants: number | null;
}): Promise<Session> {
  const sessions = await dataSource.sessions.list();
  let code = generateJoinCode(CODE_LENGTH);
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
    if (!sessions.some((session) => session.code === code)) break;
    code = generateJoinCode(CODE_LENGTH);
  }

  const now = new Date().toISOString();
  const session: Session = {
    id: uid("ses"),
    code,
    packageId: input.packageId,
    hostId: input.hostId,
    title: { id: input.title, en: input.title },
    mode: input.mode,
    status: "lobby",
    requireLogin: input.requireLogin,
    maxParticipants: input.maxParticipants,
    shuffleQuestions: true,
    shuffleOptions: true,
    showResultsImmediately: input.showResultsImmediately,
    leaderboard: input.leaderboard,
    extraTimeSeconds: 0,
    participants: [],
    createdAt: now,
  };

  await dataSource.sessions.create(session);
  await dataSource.activityLogs.add({
    userId: input.hostId,
    userName: input.hostId,
    action: "session.create",
    targetType: "session",
    targetId: session.id,
    message: { id: `Membuat sesi ${session.code}`, en: `Created session ${session.code}` },
  });

  return session;
}

export async function setSessionStatus(sessionId: string, status: Session["status"]): Promise<Session> {
  const updated = await dataSource.sessions.setStatus(sessionId, status);
  await dataSource.activityLogs.add({
    userId: updated.hostId,
    userName: updated.hostId,
    action: `session.${status}`,
    targetType: "session",
    targetId: sessionId,
    message: { id: `Sesi ${updated.code} → ${status}`, en: `Session ${updated.code} → ${status}` },
  });
  return updated;
}

/** Nudges the participant row — called from the exam room as answers land. */
export async function updateParticipantProgress(
  sessionId: string,
  participantId: string,
  patch: Partial<Pick<SessionParticipant, "answered" | "total" | "currentIndex" | "score" | "status">>,
): Promise<void> {
  await dataSource.sessions.updateParticipant(sessionId, participantId, patch);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await dataSource.sessions.remove(sessionId);
}
