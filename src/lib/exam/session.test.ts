import { beforeAll, describe, expect, it } from "vitest";
import { useDbStore } from "@/lib/store/db";
import { dataSource } from "@/lib/repositories";
import { createSession, deleteSession, setSessionStatus } from "./session-service";

beforeAll(() => {
  useDbStore.getState().reset();
});

describe("live sessions", () => {
  it("creates a session with a 6-digit numeric code", async () => {
    const session = await createSession({
      packageId: "pkg-skd-a",
      hostId: "usr-host",
      title: "Latihan SKD – Sesi 1",
      mode: "live",
      leaderboard: true,
      showResultsImmediately: false,
      requireLogin: true,
      maxParticipants: 40,
    });

    expect(session.code).toMatch(/^[0-9]{6}$/);
    expect(session.status).toBe("lobby");
    expect(session.participants).toHaveLength(0);

    const stored = await dataSource.sessions.get(session.id);
    expect(stored?.code).toBe(session.code);
    expect(await dataSource.sessions.findByCode(session.code)).not.toBeNull();
  });

  it("never reuses a code that is already taken", async () => {
    const codes = new Set<string>();
    for (let index = 0; index < 25; index++) {
      const session = await createSession({
        packageId: "pkg-toefl-mini",
        hostId: "usr-host",
        title: `Sesi ${index}`,
        mode: "live",
        leaderboard: false,
        showResultsImmediately: false,
        requireLogin: false,
        maxParticipants: null,
      });
      codes.add(session.code);
    }
    expect(codes.size).toBe(25);
  });

  it("joins a session and tracks the participant", async () => {
    const session = await createSession({
      packageId: "pkg-kepribadian",
      hostId: "usr-host",
      title: "Tes Kepribadian",
      mode: "live",
      leaderboard: true,
      showResultsImmediately: true,
      requireLogin: true,
      maxParticipants: 2,
    });

    const participant = await dataSource.sessions.join(session.id, {
      userId: "usr-participant",
      name: "Andi Pratama",
      avatarColor: "#4f46e5",
      joinedAt: new Date().toISOString(),
      status: "online",
      answered: 0,
      total: 12,
      currentIndex: 0,
      score: 0,
      tabSwitchCount: 0,
    });

    const reloaded = await dataSource.sessions.get(session.id);
    expect(reloaded?.participants.map((item) => item.id)).toContain(participant.id);

    await dataSource.sessions.updateParticipant(session.id, participant.id, { answered: 6, score: 30 });
    const updated = await dataSource.sessions.get(session.id);
    expect(updated?.participants[0].answered).toBe(6);
    expect(updated?.participants[0].score).toBe(30);
  });

  it("moves a session through lobby → running → ended", async () => {
    const session = await createSession({
      packageId: "pkg-skd-a",
      hostId: "usr-host",
      title: "Sesi uji status",
      mode: "live",
      leaderboard: false,
      showResultsImmediately: false,
      requireLogin: true,
      maxParticipants: null,
    });

    const started = await setSessionStatus(session.id, "running");
    expect(started.status).toBe("running");
    expect(started.startedAt).toBeTruthy();

    const ended = await setSessionStatus(session.id, "ended");
    expect(ended.status).toBe("ended");
    expect(ended.endedAt).toBeTruthy();
  });

  it("lists sessions by host and deletes them", async () => {
    const created = await createSession({
      packageId: "pkg-umum-1",
      hostId: "usr-admin",
      title: "Sesi admin",
      mode: "self-paced",
      leaderboard: false,
      showResultsImmediately: false,
      requireLogin: false,
      maxParticipants: null,
    });

    const mine = await dataSource.sessions.listByHost("usr-admin");
    expect(mine.map((item) => item.id)).toContain(created.id);

    await deleteSession(created.id);
    expect(await dataSource.sessions.get(created.id)).toBeNull();
  });
});
