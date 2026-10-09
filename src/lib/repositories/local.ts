import type {
  ActivityLog,
  Attempt,
  AppSettings,
  Category,
  Database,
  Payment,
  PaymentStatus,
  PublicUser,
  Question,
  Session,
  SessionParticipant,
  Subtest,
  TestType,
  TryoutPackage,
  User,
  Voucher,
} from "@/types";
import { uid } from "@/lib/utils";
import { createSeedDatabase } from "@/lib/seed";
import { useDbStore } from "@/lib/store/db";
import type {
  ActivityLogRepository,
  AttemptRepository,
  CategoryRepository,
  CrudRepository,
  DataSource,
  PackageFilter,
  PackageRepository,
  PaymentRepository,
  QuestionRepository,
  SessionRepository,
  SettingsRepository,
  SubtestRepository,
  TestTypeRepository,
  UserRepository,
  VoucherRepository,
} from "./types";

/* ----------------------------- plumbing ---------------------------------- */

/** Artificial latency so the UI exercises its loading / skeleton states. */
const READ_LATENCY = 25;
const WRITE_LATENCY = 60;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function snapshot(): Database {
  return useDbStore.getState().db;
}

async function read<T>(selector: (db: Database) => T): Promise<T> {
  await delay(READ_LATENCY);
  return selector(snapshot());
}

async function commit<T>(recipe: (db: Database) => [Database, T]): Promise<T> {
  await delay(WRITE_LATENCY);
  let output!: T;
  useDbStore.getState().mutate((db) => {
    const [next, result] = recipe(db);
    output = result;
    return next;
  });
  return output;
}

function crud<T extends { id: string }>(
  getList: (db: Database) => T[],
  setList: (db: Database, list: T[]) => Database,
): CrudRepository<T> {
  return {
    list: () => read((db) => [...getList(db)]),
    get: async (id) => (await read(getList)).find((item) => item.id === id) ?? null,
    create: (entity) => commit((db) => [setList(db, [...getList(db), entity]), entity]),
    update: (id, patch) =>
      commit((db) => {
        const list = getList(db);
        const index = list.findIndex((item) => item.id === id);
        if (index < 0) throw new Error(`Record not found: ${id}`);
        const next = { ...list[index], ...patch } as T;
        const copy = [...list];
        copy[index] = next;
        return [setList(db, copy), next];
      }),
    remove: (id) => commit((db) => [setList(db, getList(db).filter((item) => item.id !== id)), undefined]),
  };
}

const questionList = (db: Database) => db.questions;
const packageList = (db: Database) => db.packages;
const userList = (db: Database) => db.users;
const subtestList = (db: Database) => db.subtests;
const testTypeList = (db: Database) => db.testTypes;
const sessionList = (db: Database) => db.sessions;
const attemptList = (db: Database) => db.attempts;
const paymentList = (db: Database) => db.payments;
const voucherList = (db: Database) => db.vouchers;
const categoryList = (db: Database) => db.categories;
const logList = (db: Database) => db.activityLogs;

const setQuestions = (db: Database, list: Question[]): Database => ({ ...db, questions: list });
const setPackages = (db: Database, list: TryoutPackage[]): Database => ({ ...db, packages: list });
const setUsers = (db: Database, list: User[]): Database => ({ ...db, users: list });
const setSubtests = (db: Database, list: Subtest[]): Database => ({ ...db, subtests: list });
const setTestTypes = (db: Database, list: TestType[]): Database => ({ ...db, testTypes: list });
const setSessions = (db: Database, list: Session[]): Database => ({ ...db, sessions: list });
const setAttempts = (db: Database, list: Attempt[]): Database => ({ ...db, attempts: list });
const setPayments = (db: Database, list: Payment[]): Database => ({ ...db, payments: list });
const setVouchers = (db: Database, list: Voucher[]): Database => ({ ...db, vouchers: list });
const setCategories = (db: Database, list: Category[]): Database => ({ ...db, categories: list });
const setLogs = (db: Database, list: ActivityLog[]): Database => ({ ...db, activityLogs: list });

const toPublic = ({ password: _password, ...rest }: User): PublicUser => rest;

/* ------------------------------- users ----------------------------------- */

const users: UserRepository = {
  ...crud<User>(userList, setUsers),
  findByEmail: (email) =>
    read((db) => db.users.find((user) => user.email.toLowerCase() === email.trim().toLowerCase()) ?? null),

  async authenticate(email, password) {
    const user = await users.findByEmail(email);
    if (!user || user.password !== password) return { ok: false, reason: "invalid-credentials" };
    if (user.status === "suspended") return { ok: false, reason: "suspended" };
    await users.touchLastLogin(user.id);
    return { ok: true, user: toPublic(user) };
  },

  async register(input) {
    const existing = await users.findByEmail(input.email);
    if (existing) return { ok: false, reason: "email-taken" };
    const user: User = {
      id: uid("usr"),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      role: "participant",
      institution: input.institution?.trim() || undefined,
      avatarColor: `hsl(${Math.floor(Math.random() * 360)} 65% 45%)`,
      status: "active",
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    await commit((db) => [{ ...db, users: [...db.users, user] }, user]);
    return { ok: true, user: toPublic(user) };
  },

  touchLastLogin: (id) =>
    commit((db) => [
      { ...db, users: db.users.map((user) => (user.id === id ? { ...user, lastLoginAt: new Date().toISOString() } : user)) },
      undefined,
    ]),

  listPublic: () => read((db) => db.users.map(toPublic)),
};

/* ----------------------------- categories -------------------------------- */

const categories: CategoryRepository = {
  ...crud<Category>(categoryList, setCategories),
  getBySlug: (slug) => read((db) => db.categories.find((category) => category.slug === slug) ?? null),
};

/* ----------------------------- test types -------------------------------- */

const testTypes: TestTypeRepository = {
  ...crud<TestType>(testTypeList, setTestTypes),
  getBySlug: (slug) => read((db) => db.testTypes.find((type) => type.slug === slug) ?? null),
};

/* ------------------------------ subtests --------------------------------- */

const subtests: SubtestRepository = {
  ...crud<Subtest>(subtestList, setSubtests),
  listByTestType: (testTypeId) =>
    read((db) => db.subtests.filter((item) => item.testTypeId === testTypeId).sort((a, b) => a.order - b.order)),
};

/* ----------------------------- questions --------------------------------- */

function questionText(question: Question) {
  const parts: string[] = [question.prompt.id, question.prompt.en ?? ""];
  if (question.type === "multiple-choice" || question.type === "image-choice" || question.type === "weighted-choice") {
    parts.push(...question.options.map((option) => `${option.content.id} ${option.content.en ?? ""}`));
  }
  if (question.type === "group") {
    parts.push(...question.children.map((child) => `${child.prompt.id} ${child.prompt.en ?? ""}`));
  }
  if (question.type === "listening") {
    parts.push(question.inner.prompt.id, question.transcript?.id ?? "");
  }
  if (question.type === "fill-blank") parts.push(question.template.id);
  if (question.type === "matching") parts.push(...question.pairs.map((pair) => pair.left.id));
  if (question.type === "ordering") parts.push(...question.items.map((item) => item.content.id));
  return parts.join(" ").toLowerCase();
}

const questions: QuestionRepository = {
  ...crud<Question>(questionList, setQuestions),

  async listByFilter(filter) {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const search = filter.search?.trim().toLowerCase() ?? "";
    const all = await read((db) => db.questions);
    const filtered = all.filter((question) => {
      if (filter.testTypeId && question.testTypeId !== filter.testTypeId) return false;
      if (filter.subtestId && question.subtestId !== filter.subtestId) return false;
      if (filter.types?.length && !filter.types.includes(question.type)) return false;
      if (filter.difficulties?.length && !filter.difficulties.includes(question.difficulty)) return false;
      if (filter.tags?.length && !filter.tags.some((tag) => question.tags.includes(tag))) return false;
      if (search && !questionText(question).includes(search) && !question.topics.join(" ").toLowerCase().includes(search)) {
        return false;
      }
      return true;
    });
    return {
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
      total: filtered.length,
    };
  },

  duplicate: (id) =>
    commit((db) => {
      const source = db.questions.find((question) => question.id === id);
      if (!source) throw new Error(`Question not found: ${id}`);
      const copy = JSON.parse(JSON.stringify(source)) as Question;
      copy.id = uid("q");
      copy.createdAt = new Date().toISOString();
      copy.updatedAt = copy.createdAt;
      if ("prompt" in copy && copy.prompt) {
        copy.prompt = { ...copy.prompt, id: `${copy.prompt.id} (salinan)` };
      }
      return [{ ...db, questions: [...db.questions, copy] }, copy];
    }),

  bulkCreate: (items) => commit((db) => [{ ...db, questions: [...db.questions, ...items] }, items]),

  removeByTag: (tag) =>
    commit((db) => [
      { ...db, questions: db.questions.filter((question) => !question.tags.includes(tag)) },
      undefined,
    ]),

  async exportJson(ids) {
    const all = await read((db) => db.questions);
    const selected = ids?.length ? all.filter((question) => ids.includes(question.id)) : all;
    return JSON.stringify(selected, null, 2);
  },

  async importJson(json) {
    const parsed = JSON.parse(json) as Question[] | Question;
    const incoming = (Array.isArray(parsed) ? parsed : [parsed]).map((question) => ({
      ...question,
      id: question.id || uid("q"),
    }));
    return commit((db) => [{ ...db, questions: [...db.questions, ...incoming] }, incoming]);
  },
};

/* ------------------------------ packages --------------------------------- */

function sortPackages(items: TryoutPackage[], sort: PackageFilter["sort"]) {
  const copy = [...items];
  switch (sort) {
    case "popular":
      return copy.sort((a, b) => b.participantCount - a.participantCount);
    case "price-asc":
      return copy.sort((a, b) => (a.discountPrice ?? a.price) - (b.discountPrice ?? b.price));
    case "price-desc":
      return copy.sort((a, b) => (b.discountPrice ?? b.price) - (a.discountPrice ?? a.price));
    case "title":
      return copy.sort((a, b) => a.title.id.localeCompare(b.title.id));
    case "newest":
    default:
      return copy.sort(
        (a, b) => new Date(b.publishedAt ?? b.createdAt).getTime() - new Date(a.publishedAt ?? a.createdAt).getTime(),
      );
  }
}

const packages: PackageRepository = {
  ...crud<TryoutPackage>(packageList, setPackages),

  listPublished: () => read((db) => db.packages.filter((item) => item.status === "published")),

  async listByFilter(filter) {
    const search = filter.search?.trim().toLowerCase() ?? "";
    const all = await read((db) => db.packages);
    const filtered = all.filter((item) => {
      if (filter.status && item.status !== filter.status) return false;
      if (!filter.status && item.status !== "published") return false;
      if (filter.categoryId && item.categoryId !== filter.categoryId) return false;
      if (filter.pricingModel && item.pricingModel !== filter.pricingModel) return false;
      if (filter.testTypeId && item.testTypeId !== filter.testTypeId) return false;
      if (search) {
        const haystack = `${item.title.id} ${item.title.en ?? ""} ${item.description.id} ${item.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
    return sortPackages(filtered, filter.sort);
  },

  getBySlug: (slug) => read((db) => db.packages.find((item) => item.slug === slug) ?? null),

  incrementParticipants: (id) =>
    commit((db) => [
      {
        ...db,
        packages: db.packages.map((item) =>
          item.id === id ? { ...item, participantCount: item.participantCount + 1 } : item,
        ),
      },
      undefined,
    ]),
};

/* ------------------------------ sessions --------------------------------- */

const sessions: SessionRepository = {
  ...crud<Session>(sessionList, setSessions),

  findByCode: (code) =>
    read((db) => db.sessions.find((session) => session.code.toUpperCase() === code.trim().toUpperCase()) ?? null),

  listByHost: (hostId) => read((db) => db.sessions.filter((session) => session.hostId === hostId)),

  join: (sessionId, participant) =>
    commit((db) => {
      const entry: SessionParticipant = { ...participant, id: uid("sp"), sessionId };
      return [
        {
          ...db,
          sessions: db.sessions.map((session) =>
            session.id === sessionId ? { ...session, participants: [...session.participants, entry] } : session,
          ),
        },
        entry,
      ];
    }),

  updateParticipant: (sessionId, participantId, patch) =>
    commit((db) => [
      {
        ...db,
        sessions: db.sessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                participants: session.participants.map((participant) =>
                  participant.id === participantId ? { ...participant, ...patch } : participant,
                ),
              }
            : session,
        ),
      },
      undefined,
    ]),

  setStatus: (sessionId, status) =>
    commit((db) => {
      const session = db.sessions.find((item) => item.id === sessionId);
      if (!session) throw new Error(`Session not found: ${sessionId}`);
      const next: Session = {
        ...session,
        status,
        startedAt: status === "running" ? (session.startedAt ?? new Date().toISOString()) : session.startedAt,
        pausedAt: status === "paused" ? new Date().toISOString() : undefined,
        endedAt: status === "ended" ? new Date().toISOString() : undefined,
      };
      return [{ ...db, sessions: db.sessions.map((item) => (item.id === sessionId ? next : item)) }, next];
    }),
};

/* ------------------------------ attempts --------------------------------- */

const attempts: AttemptRepository = {
  ...crud<Attempt>(attemptList, setAttempts),

  listByUser: (userId) =>
    read((db) =>
      db.attempts
        .filter((attempt) => attempt.userId === userId)
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()),
    ),

  listByPackage: (packageId) => read((db) => db.attempts.filter((attempt) => attempt.packageId === packageId)),

  findActive: (userId, packageId) =>
    read(
      (db) =>
        db.attempts.find(
          (attempt) =>
            attempt.userId === userId && attempt.packageId === packageId && attempt.status === "in-progress",
        ) ?? null,
    ),

  saveAnswers: (attemptId, answers) =>
    commit((db) => {
      const updated: Attempt[] = db.attempts.map((attempt) =>
        attempt.id === attemptId ? { ...attempt, answers: { ...attempt.answers, ...answers } } : attempt,
      );
      const next = updated.find((attempt) => attempt.id === attemptId);
      if (!next) throw new Error(`Attempt not found: ${attemptId}`);
      return [{ ...db, attempts: updated }, next];
    }),

  submit: (attemptId, result) =>
    commit((db) => {
      let next: Attempt | undefined;
      const updated = db.attempts.map((attempt) => {
        if (attempt.id !== attemptId) return attempt;
        next = {
          ...attempt,
          status: "submitted",
          submittedAt: result.gradedAt,
          result,
          timeLeftSeconds: 0,
        };
        return next;
      });
      if (!next) throw new Error(`Attempt not found: ${attemptId}`);
      return [{ ...db, attempts: updated }, next];
    }),
};

/* ------------------------------ payments --------------------------------- */

function randomUniqueCode() {
  return 100 + Math.floor(Math.random() * 900);
}

const payments: PaymentRepository = {
  ...crud<Payment>(paymentList, setPayments),

  listByUser: (userId) =>
    read((db) =>
      db.payments
        .filter((payment) => payment.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    ),

  listByStatus: (status: PaymentStatus) => read((db) => db.payments.filter((payment) => payment.status === status)),

  async createInvoice(input) {
    const discount = input.discount ?? 0;
    const amount = Math.max(0, input.amount - discount);
    const uniqueCode = amount > 0 ? randomUniqueCode() : 0;
    const invoice: Payment = {
      id: uid("pay"),
      invoiceCode: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      userId: input.userId,
      packageId: input.packageId,
      amount: input.amount,
      uniqueCode,
      total: amount + uniqueCode,
      discount,
      voucherCode: input.voucherCode,
      methodId: input.methodId,
      status: "pending",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    };
    return commit((db) => [{ ...db, payments: [...db.payments, invoice] }, invoice]);
  },

  uploadProof: (id, proof) =>
    payments.update(id, {
      proofUrl: proof.proofUrl,
      proofFileName: proof.proofFileName,
      uploadedAt: new Date().toISOString(),
      status: "pending",
    }),

  approve: (id, verifiedBy) =>
    payments.update(id, { status: "approved", verifiedBy, verifiedAt: new Date().toISOString(), note: undefined }),

  reject: (id, verifiedBy, note) =>
    payments.update(id, { status: "rejected", verifiedBy, verifiedAt: new Date().toISOString(), note }),
};

/* ------------------------------ vouchers --------------------------------- */

const vouchers: VoucherRepository = {
  ...crud<Voucher>(voucherList, setVouchers),

  findByCode: (code) =>
    read((db) => db.vouchers.find((voucher) => voucher.code.toUpperCase() === code.trim().toUpperCase()) ?? null),

  async validate(code, context) {
    const voucher = await vouchers.findByCode(code);
    if (!voucher) return { ok: false, reason: "not-found" };
    if (!voucher.active) return { ok: false, reason: "inactive" };
    const now = Date.now();
    if (new Date(voucher.validFrom).getTime() > now) return { ok: false, reason: "not-started" };
    if (new Date(voucher.validUntil).getTime() < now) return { ok: false, reason: "expired" };
    if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) return { ok: false, reason: "exhausted" };
    if (voucher.minAmount && context.amount < voucher.minAmount) return { ok: false, reason: "minimum-amount" };
    if (voucher.packageIds.length > 0 && !voucher.packageIds.includes(context.packageId)) {
      return { ok: false, reason: "not-applicable" };
    }
    const discount =
      voucher.type === "percent"
        ? Math.min(Math.round((context.amount * voucher.value) / 100), voucher.maxDiscount ?? Number.MAX_SAFE_INTEGER)
        : Math.min(voucher.value, context.amount);
    return { ok: true, voucher, discount };
  },
};

/* ------------------------------ settings --------------------------------- */

const settingsRepo: SettingsRepository = {
  get: () => read((db) => db.settings),
  update: (patch) =>
    commit((db) => {
      const next: AppSettings = { ...db.settings, ...patch };
      return [{ ...db, settings: next }, next];
    }),
};

/* --------------------------- activity logs ------------------------------- */

const activityLogs: ActivityLogRepository = {
  ...crud<ActivityLog>(logList, setLogs),

  add: (entry) =>
    commit((db) => {
      const log: ActivityLog = { ...entry, id: uid("log"), createdAt: new Date().toISOString() };
      return [{ ...db, activityLogs: [log, ...db.activityLogs].slice(0, 200) }, log];
    }),

  listRecent: (limit = 10) =>
    read((db) =>
      [...db.activityLogs]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit),
    ),
};

/* ----------------------------- data source ------------------------------- */

export const localDataSource: DataSource = {
  users,
  categories,
  testTypes,
  subtests,
  questions,
  packages,
  sessions,
  attempts,
  payments,
  vouchers,
  settings: settingsRepo,
  activityLogs,
  exportDatabase: () => read((db) => JSON.parse(JSON.stringify(db)) as Database),
  importDatabase: (db) => commit(() => [db, undefined]),
  resetDatabase: () => commit(() => [createSeedDatabase(), undefined]),
};
