import type {
  ActivityLog,
  AnswerRecord,
  Attempt,
  AttemptResult,
  Category,
  Database,
  Difficulty,
  Payment,
  PaymentStatus,
  PublicUser,
  ConversionTable,
  Question,
  QuestionType,
  Session,
  SessionParticipant,
  Subtest,
  TestType,
  TryoutPackage,
  User,
  Voucher,
  AppSettings,
} from "@/types";

/**
 * The contract every UI feature talks to. The bundled implementation
 * (`localDataSource`) keeps everything in localStorage through Zustand, but a
 * Supabase/Firebase implementation only has to satisfy these interfaces —
 * no component or page changes required.
 */
export interface CrudRepository<T extends { id: string }> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  create(entity: T): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
}

export type AuthResult =
  | { ok: true; user: PublicUser }
  | { ok: false; reason: "invalid-credentials" | "suspended" | "email-taken" };

export interface UserRepository extends CrudRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  authenticate(email: string, password: string): Promise<AuthResult>;
  register(input: { name: string; email: string; password: string; institution?: string }): Promise<AuthResult>;
  touchLastLogin(id: string): Promise<void>;
  listPublic(): Promise<PublicUser[]>;
}

export interface QuestionFilter {
  search?: string;
  testTypeId?: string;
  subtestId?: string;
  types?: QuestionType[];
  difficulties?: Difficulty[];
  tags?: string[];
  page?: number;
  pageSize?: number;
}

export interface QuestionRepository extends CrudRepository<Question> {
  listByFilter(filter: QuestionFilter): Promise<{ items: Question[]; total: number }>;
  duplicate(id: string): Promise<Question>;
  bulkCreate(questions: Question[]): Promise<Question[]>;
  removeByTag(tag: string): Promise<void>;
  exportJson(ids?: string[]): Promise<string>;
  importJson(json: string): Promise<Question[]>;
}

export interface PackageFilter {
  search?: string;
  categoryId?: string;
  pricingModel?: TryoutPackage["pricingModel"];
  testTypeId?: string;
  status?: TryoutPackage["status"];
  sort?: "newest" | "popular" | "price-asc" | "price-desc" | "title";
}

export interface PackageRepository extends CrudRepository<TryoutPackage> {
  listPublished(): Promise<TryoutPackage[]>;
  listByFilter(filter: PackageFilter): Promise<TryoutPackage[]>;
  getBySlug(slug: string): Promise<TryoutPackage | null>;
  incrementParticipants(id: string): Promise<void>;
}

export interface SubtestRepository extends CrudRepository<Subtest> {
  listByTestType(testTypeId: string): Promise<Subtest[]>;
}

/** Raw → scaled score tables (TOEFL). Read-mostly, so plain CRUD is enough. */
export type ConversionTableRepository = CrudRepository<ConversionTable>;

export interface TestTypeRepository extends CrudRepository<TestType> {
  getBySlug(slug: string): Promise<TestType | null>;
}

export interface SessionRepository extends CrudRepository<Session> {
  findByCode(code: string): Promise<Session | null>;
  listByHost(hostId: string): Promise<Session[]>;
  join(sessionId: string, participant: Omit<SessionParticipant, "id" | "sessionId">): Promise<SessionParticipant>;
  updateParticipant(sessionId: string, participantId: string, patch: Partial<SessionParticipant>): Promise<void>;
  setStatus(sessionId: string, status: Session["status"]): Promise<Session>;
}

export interface AttemptRepository extends CrudRepository<Attempt> {
  listByUser(userId: string): Promise<Attempt[]>;
  listByPackage(packageId: string): Promise<Attempt[]>;
  findActive(userId: string, packageId: string): Promise<Attempt | null>;
  saveAnswers(attemptId: string, answers: Record<string, AnswerRecord>): Promise<Attempt>;
  submit(attemptId: string, result: AttemptResult): Promise<Attempt>;
}

export interface PaymentRepository extends CrudRepository<Payment> {
  listByUser(userId: string): Promise<Payment[]>;
  listByStatus(status: PaymentStatus): Promise<Payment[]>;
  createInvoice(input: {
    userId: string;
    packageId: string;
    amount: number;
    discount?: number;
    voucherCode?: string;
    methodId: string;
  }): Promise<Payment>;
  uploadProof(id: string, proof: { proofUrl?: string; proofFileName: string }): Promise<Payment>;
  approve(id: string, verifiedBy: string): Promise<Payment>;
  reject(id: string, verifiedBy: string, note: string): Promise<Payment>;
}

export interface VoucherRepository extends CrudRepository<Voucher> {
  findByCode(code: string): Promise<Voucher | null>;
  validate(
    code: string,
    context: { packageId: string; amount: number },
  ): Promise<{ ok: true; voucher: Voucher; discount: number } | { ok: false; reason: string }>;
}

export interface SettingsRepository {
  get(): Promise<AppSettings>;
  update(patch: Partial<AppSettings>): Promise<AppSettings>;
}

export interface ActivityLogRepository extends CrudRepository<ActivityLog> {
  add(entry: Omit<ActivityLog, "id" | "createdAt">): Promise<ActivityLog>;
  listRecent(limit?: number): Promise<ActivityLog[]>;
}

export interface CategoryRepository extends CrudRepository<Category> {
  getBySlug(slug: string): Promise<Category | null>;
}

export interface DataSource {
  users: UserRepository;
  categories: CategoryRepository;
  testTypes: TestTypeRepository;
  subtests: SubtestRepository;
  conversionTables: ConversionTableRepository;
  questions: QuestionRepository;
  packages: PackageRepository;
  sessions: SessionRepository;
  attempts: AttemptRepository;
  payments: PaymentRepository;
  vouchers: VoucherRepository;
  settings: SettingsRepository;
  activityLogs: ActivityLogRepository;
  /** Whole-database helpers (reset demo data, import/export). */
  exportDatabase(): Promise<Database>;
  importDatabase(db: Database): Promise<void>;
  resetDatabase(): Promise<void>;
}
