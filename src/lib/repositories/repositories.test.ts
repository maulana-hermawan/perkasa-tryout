import { beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "./index";
import { useDbStore } from "@/lib/store/db";

/** The mock backend keeps everything in memory, so reset it before the run. */
beforeAll(() => {
  useDbStore.getState().reset();
});

describe("users & auth", () => {
  it("authenticates the demo participant", async () => {
    const result = await dataSource.users.authenticate("peserta@tryoutku.id", "peserta123");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.role).toBe("participant");
      expect("password" in result.user).toBe(false);
    }
  });

  it("rejects a wrong password", async () => {
    const result = await dataSource.users.authenticate("peserta@tryoutku.id", "salah");
    expect(result).toEqual({ ok: false, reason: "invalid-credentials" });
  });

  it("rejects a suspended account", async () => {
    const result = await dataSource.users.authenticate("rizky@email.com", "peserta123");
    expect(result).toEqual({ ok: false, reason: "suspended" });
  });

  it("registers a new participant and rejects duplicates", async () => {
    const created = await dataSource.users.register({
      name: "Uji Coba",
      email: "uji@example.com",
      password: "rahasia123",
    });
    expect(created.ok).toBe(true);

    const duplicate = await dataSource.users.register({
      name: "Uji Coba",
      email: "uji@example.com",
      password: "rahasia123",
    });
    expect(duplicate).toEqual({ ok: false, reason: "email-taken" });
  });
});

describe("packages", () => {
  it("lists only published packages by default", async () => {
    const all = await dataSource.packages.listByFilter({});
    expect(all.every((pkg) => pkg.status === "published")).toBe(true);
    expect(all).toHaveLength(5);
  });

  it("filters by pricing model", async () => {
    expect(await dataSource.packages.listByFilter({ pricingModel: "free" })).toHaveLength(2);
    expect(await dataSource.packages.listByFilter({ pricingModel: "freemium" })).toHaveLength(2);
    expect(await dataSource.packages.listByFilter({ pricingModel: "paid" })).toHaveLength(1);
  });

  it("filters by category and search", async () => {
    const skd = await dataSource.packages.listByFilter({ categoryId: "cat-skd" });
    expect(skd.map((pkg) => pkg.id)).toEqual(["pkg-skd-a"]);

    const searched = await dataSource.packages.listByFilter({ search: "kraepelin" });
    expect(searched.map((pkg) => pkg.id)).toContain("pkg-kecermatan");
  });

  it("sorts by price and popularity", async () => {
    const cheapest = await dataSource.packages.listByFilter({ sort: "price-asc" });
    expect(cheapest[0].pricingModel).toBe("free");

    const popular = await dataSource.packages.listByFilter({ sort: "popular" });
    expect(popular[0].id).toBe("pkg-skd-a");
  });
});

describe("questions", () => {
  it("filters by subtest and paginates", async () => {
    const page = await dataSource.questions.listByFilter({ subtestId: "st-tiu", page: 1, pageSize: 5 });
    expect(page.total).toBe(10);
    expect(page.items).toHaveLength(5);
  });

  it("searches prompt and options", async () => {
    const { total } = await dataSource.questions.listByFilter({ search: "pancasila" });
    expect(total).toBeGreaterThan(0);
  });

  it("exports and imports JSON", async () => {
    const json = await dataSource.questions.exportJson(["q-twk-01"]);
    expect(JSON.parse(json)).toHaveLength(1);
    const imported = await dataSource.questions.importJson(json);
    expect(imported).toHaveLength(1);
  });

  it("duplicates a question with a new id", async () => {
    const copy = await dataSource.questions.duplicate("q-twk-01");
    expect(copy.id).not.toBe("q-twk-01");
    const stored = await dataSource.questions.get(copy.id);
    expect(stored?.prompt.id).toContain("salinan");
  });
});

describe("payments & vouchers", () => {
  it("creates an invoice with a 3-digit unique code", async () => {
    const invoice = await dataSource.payments.createInvoice({
      userId: "usr-participant",
      packageId: "pkg-kecermatan",
      amount: 29_000,
      methodId: "pm-bca",
    });
    expect(invoice.status).toBe("pending");
    expect(invoice.uniqueCode).toBeGreaterThanOrEqual(100);
    expect(invoice.uniqueCode).toBeLessThanOrEqual(999);
    expect(invoice.total).toBe(29_000 + invoice.uniqueCode);

    const approved = await dataSource.payments.approve(invoice.id, "usr-admin");
    expect(approved.status).toBe("approved");
  });

  it("applies a valid voucher", async () => {
    const result = await dataSource.vouchers.validate("PERKASA10", {
      packageId: "pkg-skd-a",
      amount: 39_000,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.discount).toBe(3_900);
  });

  it("rejects vouchers that do not apply", async () => {
    expect(await dataSource.vouchers.validate("DISKON25", { packageId: "pkg-skd-a", amount: 10_000 })).toEqual({
      ok: false,
      reason: "minimum-amount",
    });
    // Expired and out of quota — the first failing rule wins.
    expect(await dataSource.vouchers.validate("GRATIS2025", { packageId: "pkg-skd-a", amount: 50_000 })).toEqual({
      ok: false,
      reason: "inactive",
    });
    expect(await dataSource.vouchers.validate("NOPENOPE", { packageId: "pkg-skd-a", amount: 50_000 })).toEqual({
      ok: false,
      reason: "not-found",
    });
  });

  it("rejects an active voucher whose quota is used up", async () => {
    await dataSource.vouchers.create({
      id: "voc-test-habis",
      code: "HABIS",
      type: "amount",
      value: 10_000,
      usageLimit: 2,
      usedCount: 2,
      validFrom: new Date(Date.now() - 86_400_000).toISOString(),
      validUntil: new Date(Date.now() + 86_400_000).toISOString(),
      active: true,
      packageIds: [],
    });
    expect(await dataSource.vouchers.validate("HABIS", { packageId: "pkg-skd-a", amount: 50_000 })).toEqual({
      ok: false,
      reason: "exhausted",
    });
  });
});

describe("sessions & attempts", () => {
  it("finds a session by code, case-insensitively", async () => {
    const session = await dataSource.sessions.findByCode("k7x2p9");
    expect(session?.id).toBe("ses-live-umum");
    expect(await dataSource.sessions.findByCode("ZZZZZZ")).toBeNull();
  });

  it("joins a session", async () => {
    const participant = await dataSource.sessions.join("ses-live-umum", {
      userId: "usr-participant",
      name: "Andini Lestari",
      avatarColor: "#f97316",
      joinedAt: new Date().toISOString(),
      status: "online",
      answered: 0,
      total: 14,
      currentIndex: 0,
      score: 0,
      tabSwitchCount: 0,
    });
    const session = await dataSource.sessions.get("ses-live-umum");
    expect(session?.participants.map((item) => item.id)).toContain(participant.id);
  });

  it("finds and updates an in-progress attempt", async () => {
    const active = await dataSource.attempts.findActive("usr-participant", "pkg-umum-1");
    expect(active?.id).toBe("att-umum-1");

    const updated = await dataSource.attempts.saveAnswers("att-umum-1", {
      "q-umum-pu-01": {
        questionId: "q-umum-pu-01",
        type: "multiple-choice",
        value: { kind: "choice", optionId: "b" },
        marked: false,
        updatedAt: new Date().toISOString(),
        timeSpentSeconds: 12,
      },
    });
    expect(updated.answers["q-umum-pu-01"].value).toEqual({ kind: "choice", optionId: "b" });
  });
});

describe("settings & activity log", () => {
  it("updates settings", async () => {
    const updated = await dataSource.settings.update({ brandName: "TryoutKu Demo" });
    expect(updated.brandName).toBe("TryoutKu Demo");
  });

  it("appends activity logs", async () => {
    const log = await dataSource.activityLogs.add({
      userId: "usr-participant",
      userName: "Andini Lestari",
      action: "test.run",
      targetType: "test",
      targetId: "1",
      message: { id: "menjalankan pengujian", en: "running tests" },
    });
    const recent = await dataSource.activityLogs.listRecent(1);
    expect(recent[0].id).toBe(log.id);
  });
});
