/**
 * TryoutKu — domain model.
 *
 * Everything the UI needs is described here. Data entities are plain serializable
 * objects so the mock backend (Zustand + localStorage) can be swapped for
 * Supabase/Firebase without touching a single component: see
 * `src/lib/repositories`.
 */

/* ------------------------------------------------------------------ */
/* Localization & theme                                                */
/* ------------------------------------------------------------------ */

export type Locale = "id" | "en";
export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/** `{ id: "…", en: "…" }` — `en` falls back to `id` at render time. */
export interface I18nText {
  id: string;
  en?: string;
}

/** Rich (HTML) content, localized. Math is stored as `<span data-math="…">`. */
export type RichContent = I18nText;

export function textOf(value: I18nText | undefined, locale: Locale): string {
  if (!value) return "";
  if (locale === "en") return value.en ?? value.id;
  return value.id;
}

/* ------------------------------------------------------------------ */
/* Users & auth                                                        */
/* ------------------------------------------------------------------ */

export type Role = "participant" | "host" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  /** Mock auth only — never do this in a real backend. */
  password: string;
  role: Role;
  phone?: string;
  institution?: string;
  avatarColor: string;
  status: "active" | "suspended";
  createdAt: string;
  lastLoginAt?: string;
}

export type PublicUser = Omit<User, "password">;

/* ------------------------------------------------------------------ */
/* Content taxonomy                                                    */
/* ------------------------------------------------------------------ */

export interface Category {
  id: string;
  slug: string;
  name: I18nText;
  icon: string; // lucide icon name
  color: string; // tailwind gradient classes
  order: number;
}

export type Difficulty = "easy" | "medium" | "hard";

/* ------------------------------------------------------------------ */
/* Question types                                                      */
/* ------------------------------------------------------------------ */

export type QuestionType =
  | "multiple-choice"
  | "multiple-answer"
  | "weighted-choice"
  | "fill-blank"
  | "essay"
  | "true-false"
  | "matching"
  | "listening"
  | "ordering"
  | "image-choice"
  | "likert"
  | "group"
  /* Tes Kecermatan */
  | "kecermatan-karakter"
  | "kecermatan-kraepelin"
  | "kecermatan-perbandingan";

export interface QuestionBase {
  id: string;
  testTypeId: string;
  subtestId: string;
  /** Rich prompt (text + math + images). */
  prompt: RichContent;
  /** Pembahasan — revealed after submit (freemium: after payment). */
  explanation?: RichContent;
  difficulty: Difficulty;
  topics: string[];
  tags: string[];
  /** Optional per-question time limit (seconds). */
  timeLimitSeconds?: number;
  /** For questions belonging to a shared stimulus (group). */
  groupId?: string;
  estimatedSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChoiceOption {
  id: string;
  content: RichContent;
  /** Used by weighted-choice (TKP 1–5, personality scales). */
  weight?: number;
  /** Personality dimension this option contributes to. */
  dimension?: string;
  imageUrl?: string;
}

export interface MultipleChoiceQuestion extends QuestionBase {
  type: "multiple-choice";
  options: ChoiceOption[];
  correctOptionId: string;
  shuffleOptions?: boolean;
}

export interface MultipleAnswerQuestion extends QuestionBase {
  type: "multiple-answer";
  options: ChoiceOption[];
  correctOptionIds: string[];
  /** `partial` gives `points / correctCount` per right pick minus wrong picks. */
  partialScoring: boolean;
  penalizeWrong?: boolean;
}

export interface WeightedChoiceQuestion extends QuestionBase {
  type: "weighted-choice";
  options: ChoiceOption[];
  /** `weight` → score = selected option weight. `closest` → distance to target. */
  mode: "weight" | "closest";
  /** Option with the ideal answer (used by `closest` & as the kunci jawaban). */
  targetOptionId?: string;
  minWeight?: number;
  maxWeight?: number;
}

export type BlankMode = "exact" | "advanced" | "numeric" | "regex";
export type BlankInput = "text" | "dropdown";

export interface BlankRule {
  id: string;
  label?: string;
  input: BlankInput;
  mode: BlankMode;
  /** Accepted answers (`advanced`), the single answer (`exact`). */
  accepted: string[];
  caseSensitive?: boolean;
  ignoreWhitespace?: boolean;
  /** Numeric tolerance, e.g. 0.5 → 3.14 accepted for 3.5 ± 0.5 */
  tolerance?: number;
  /** Regex source (`regex` mode). */
  pattern?: string;
  /** Options when `input === "dropdown"`. */
  choices?: string[];
}

export interface FillBlankQuestion extends QuestionBase {
  type: "fill-blank";
  /** HTML containing `{{blankId}}` placeholders. */
  template: RichContent;
  blanks: BlankRule[];
  /** Require every blank correct, else partial credit per blank. */
  partialScoring: boolean;
}

export interface RubricCriterion {
  id: string;
  label: I18nText;
  maxScore: number;
}

export interface EssayQuestion extends QuestionBase {
  type: "essay";
  length: "short" | "long";
  maxScore: number;
  /** Auto keyword scoring (fallback) — manual grading wins when present. */
  keywords: { term: string; points: number }[];
  rubric: RubricCriterion[];
  minWords?: number;
  manualGrading: boolean;
}

export interface TrueFalseQuestion extends QuestionBase {
  type: "true-false";
  variant: "true-false" | "yes-no";
  correct: boolean;
}

export interface MatchingPair {
  id: string;
  left: RichContent;
  right: RichContent;
}

export interface MatchingQuestion extends QuestionBase {
  type: "matching";
  pairs: MatchingPair[];
  distractors: RichContent[];
  partialScoring: boolean;
}

export interface ListeningQuestion extends QuestionBase {
  type: "listening";
  audioUrl: string;
  /** How many times the participant may play the audio (e.g. 1). */
  maxPlays: number;
  allowSeek: boolean;
  transcript?: RichContent;
  /** The wrapped question (usually multiple-choice). */
  inner: Question;
}

export interface OrderingItem {
  id: string;
  content: RichContent;
}

export interface OrderingQuestion extends QuestionBase {
  type: "ordering";
  items: OrderingItem[];
  /** Correct sequence of item ids. */
  correctOrder: string[];
  partialScoring: boolean;
}

export interface ImageChoiceQuestion extends QuestionBase {
  type: "image-choice";
  options: (ChoiceOption & { imageUrl: string })[];
  correctOptionId: string;
}

export interface LikertQuestion extends QuestionBase {
  type: "likert";
  statement: RichContent;
  /** e.g. 1–5 or 1–7 */
  min: number;
  max: number;
  minLabel: I18nText;
  maxLabel: I18nText;
  /** Big Five / DISC / … dimension this item maps to. */
  dimension?: string;
  /** Reverse-scored item. */
  reversed?: boolean;
}

export type GroupStimulus =
  | { kind: "text"; content: RichContent }
  | { kind: "audio"; audioUrl: string; transcript?: RichContent; maxPlays: number; allowSeek: boolean }
  | { kind: "image"; imageUrl: string; caption?: RichContent };

export interface GroupQuestion extends QuestionBase {
  type: "group";
  stimulus: GroupStimulus;
  children: Question[];
}

/* --- Tes Kecermatan ------------------------------------------------ */

export type KecermatanVariant = "number" | "letter" | "symbol" | "mixed";

export interface KecermatanKarakterQuestion extends QuestionBase {
  type: "kecermatan-karakter";
  variant: KecermatanVariant;
  column: number;
  indexInColumn: number;
  /** The 5 key characters the participant memorizes. */
  keyRow: string[];
  /** The 4 characters shown on screen. */
  shown: string[];
  /** The missing one (index inside `keyRow`). */
  correctIndex: number;
}

export interface KraepelinQuestion extends QuestionBase {
  type: "kecermatan-kraepelin";
  column: number;
  /** Vertical series of single digits. */
  rows: number[];
  /** Last digit of each adjacent sum — length = rows.length - 1. */
  correctAnswers: string[];
}

export type ComparisonOperator = "<" | ">" | "=";

export interface NumberComparisonQuestion extends QuestionBase {
  type: "kecermatan-perbandingan";
  left: string;
  right: string;
  correct: ComparisonOperator;
}

export type Question =
  | MultipleChoiceQuestion
  | MultipleAnswerQuestion
  | WeightedChoiceQuestion
  | FillBlankQuestion
  | EssayQuestion
  | TrueFalseQuestion
  | MatchingQuestion
  | ListeningQuestion
  | OrderingQuestion
  | ImageChoiceQuestion
  | LikertQuestion
  | GroupQuestion
  | KecermatanKarakterQuestion
  | KraepelinQuestion
  | NumberComparisonQuestion;

/** Narrowing helper. */
export type QuestionOf<T extends QuestionType> = Extract<Question, { type: T }>;

/* ------------------------------------------------------------------ */
/* Answers                                                             */
/* ------------------------------------------------------------------ */

export type AnswerValue =
  | { kind: "choice"; optionId: string }
  | { kind: "choices"; optionIds: string[] }
  | { kind: "blanks"; values: Record<string, string> }
  | { kind: "text"; text: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "matching"; map: Record<string, string> }
  | { kind: "order"; itemIds: string[] }
  | { kind: "scale"; value: number }
  | { kind: "digits"; digits: string[] }
  | { kind: "comparison"; value: ComparisonOperator }
  /** Group question: one answer per child question. */
  | { kind: "group"; values: Record<string, AnswerValue | null> };

export interface AnswerRecord {
  questionId: string;
  type: QuestionType;
  value: AnswerValue | null;
  /** "ragu-ragu" */
  marked: boolean;
  updatedAt: string;
  timeSpentSeconds: number;
  /** Manual score for essay / short answers (overrides auto scoring). */
  manualScore?: number;
  gradedAt?: string;
  graderNote?: string;
}

export function isAnswered(value: AnswerValue | null | undefined): boolean {
  if (!value) return false;
  switch (value.kind) {
    case "choice":
      return Boolean(value.optionId);
    case "choices":
      return value.optionIds.length > 0;
    case "blanks":
      return Object.values(value.values).some((v) => (v ?? "").trim() !== "");
    case "text":
      return value.text.trim() !== "";
    case "boolean":
      return value.value !== null && value.value !== undefined;
    case "matching":
      return Object.keys(value.map).length > 0;
    case "order":
      return value.itemIds.length > 0;
    case "scale":
      return Number.isFinite(value.value);
    case "digits":
      return value.digits.some((d) => d !== "");
    case "comparison":
      return Boolean(value.value);
    case "group":
      return Object.values(value.values).some(isAnswered);
    default:
      return false;
  }
}

/* ------------------------------------------------------------------ */
/* Test types, subtests, conversion tables                             */
/* ------------------------------------------------------------------ */

export interface ScoringRules {
  /** Points for a correct answer. */
  correct: number;
  /** Points for a wrong answer (may be negative). */
  wrong: number;
  /** Points for an unanswered question. */
  empty: number;
}

export type GeneratorConfig =
  | {
      kind: "kecermatan-karakter";
      variant: KecermatanVariant;
      columns: number;
      itemsPerColumn: number;
      secondsPerColumn: number;
      autoAdvance: boolean;
    }
  | {
      kind: "kecermatan-kraepelin";
      columns: number;
      rowsPerColumn: number;
      secondsPerColumn: number;
      autoAdvance: boolean;
      minDigit: number;
      maxDigit: number;
    }
  | {
      kind: "kecermatan-perbandingan";
      columns: number;
      itemsPerColumn: number;
      secondsPerColumn: number;
      autoAdvance: boolean;
      maxValue: number;
      withExpression: boolean;
    };

export interface Subtest {
  id: string;
  testTypeId: string;
  name: I18nText;
  description?: I18nText;
  instruction?: I18nText;
  order: number;
  /** `null` → the test type's global timer is used. */
  durationMinutes: number | null;
  /** Target number of questions when a package picks randomly. */
  questionCount: number;
  scoring: ScoringRules;
  passingGrade: number | null;
  allowedQuestionTypes: QuestionType[];
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  /** May the participant go back to a previous subtest? */
  allowBack: boolean;
  /** Auto-generated questions (Tes Kecermatan). */
  generator?: GeneratorConfig;
  /** Raw → scaled conversion (TOEFL). */
  conversionTableId?: string;
  /** Overrides the test type's result kind (personality → profile/radar). */
  resultKind?: "score" | "profile";
  /** Dimensions for profile subtests (Big Five, DISC, …). */
  dimensions?: PersonalityDimension[];
  icon?: string;
  color?: string;
}

export interface PersonalityDimension {
  key: string;
  label: I18nText;
  description?: I18nText;
  color?: string;
}

export interface ConversionEntry {
  raw: number;
  scaled: number;
}

export interface ConversionTable {
  id: string;
  testTypeId: string;
  name: I18nText;
  entries: ConversionEntry[];
  min: number;
  max: number;
}

export interface TestType {
  id: string;
  slug: string;
  name: I18nText;
  description?: I18nText;
  icon: string;
  color: string;
  order: number;
  /** Global timer used by subtests with `durationMinutes: null`. */
  defaultDurationMinutes: number;
  /** e.g. TOEFL scales the raw score. */
  useConversionTable: boolean;
  /** Personality tests produce a profile instead of right/wrong. */
  resultKind: "score" | "profile";
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Packages (Tryout)                                                   */
/* ------------------------------------------------------------------ */

export type PricingModel = "free" | "freemium" | "paid";

export type PackageThumbnail =
  | { kind: "gradient"; from: string; to: string; icon: string }
  | { kind: "image"; url: string };

export interface SelectionRule {
  subtestId: string;
  count: number;
  /** Share of questions per difficulty, e.g. { easy: 20, medium: 50, hard: 30 }. */
  difficultyMix?: Partial<Record<Difficulty, number>>;
  topics?: string[];
  tags?: string[];
}

export interface PackageSubtest {
  subtestId: string;
  /** Explicit picks. When empty, `selection` rules are used at attempt start. */
  questionIds: string[];
  selection?: SelectionRule;
  order: number;
}

export interface TryoutPackage {
  id: string;
  slug: string;
  title: I18nText;
  description: I18nText;
  categoryId: string;
  testTypeId: string;
  pricingModel: PricingModel;
  /** Rupiah. 0 for free. */
  price: number;
  discountPrice?: number;
  thumbnail: PackageThumbnail;
  subtests: PackageSubtest[];
  durationMinutes: number;
  totalQuestions: number;
  difficulty: Difficulty;
  rating: number;
  ratingCount: number;
  participantCount: number;
  tags: string[];
  status: "draft" | "published" | "archived";
  publishedAt?: string;
  /** Optional availability window. */
  opensAt?: string;
  closesAt?: string;
  /** Show pembahasan after submit. */
  showDiscussion: boolean;
  /** Allow returning to previous subtest. */
  allowBack: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Sessions (Wayground/Quizizz-like)                                   */
/* ------------------------------------------------------------------ */

export type SessionMode = "live" | "scheduled" | "self-paced";
export type SessionStatus = "lobby" | "running" | "paused" | "ended";

export interface SessionParticipant {
  id: string;
  sessionId: string;
  userId?: string;
  name: string;
  avatarColor: string;
  joinedAt: string;
  status: "online" | "offline" | "finished";
  answered: number;
  total: number;
  currentIndex: number;
  score: number;
  finishedAt?: string;
  tabSwitchCount: number;
  attemptId?: string;
}

export interface Session {
  id: string;
  /** 6-digit join code (characters 0-9 only). */
  code: string;
  packageId: string;
  hostId: string;
  title: I18nText;
  mode: SessionMode;
  status: SessionStatus;
  requireLogin: boolean;
  maxParticipants: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  leaderboard: boolean;
  /** scheduled */
  opensAt?: string;
  closesAt?: string;
  /** self-paced deadline */
  deadline?: string;
  extraTimeSeconds: number;
  pausedAt?: string;
  startedAt?: string;
  endedAt?: string;
  participants: SessionParticipant[];
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Attempts & results                                                  */
/* ------------------------------------------------------------------ */

export type AttemptStatus = "in-progress" | "submitted" | "graded" | "abandoned";

export interface SubtestProgress {
  subtestId: string;
  startedAt: string;
  endedAt?: string;
  secondsUsed: number;
  order: number;
}

export interface SubtestResult {
  subtestId: string;
  name: I18nText;
  rawScore: number;
  maxScore: number;
  /** After the conversion table (TOEFL). */
  scaledScore?: number;
  correct: number;
  wrong: number;
  empty: number;
  passingGrade: number | null;
  passed: boolean | null;
  secondsUsed: number;
}

export interface DimensionScore {
  dimension: string;
  label: I18nText;
  /** 0–100 normalized score. */
  score: number;
  raw: number;
  max: number;
}

export interface AttemptResult {
  totalScore: number;
  maxScore: number;
  /** After conversion table, when the test type uses one. */
  scaledScore?: number;
  percentage: number;
  correct: number;
  wrong: number;
  empty: number;
  /** Mock national ranking. */
  rank: number;
  totalParticipants: number;
  percentile: number;
  passed: boolean | null;
  perSubtest: SubtestResult[];
  /** Personality / profile tests. */
  dimensions?: DimensionScore[];
  durationSeconds: number;
  gradedAt: string;
  status: "auto" | "awaiting-manual" | "graded";
}

export interface Attempt {
  id: string;
  userId: string;
  packageId: string;
  sessionId?: string;
  status: AttemptStatus;
  startedAt: string;
  submittedAt?: string;
  deadlineAt?: string;
  answers: Record<string, AnswerRecord>;
  /** Order of questions as presented to this participant. */
  questionOrder: Record<string, string[]>; // subtestId → questionIds
  currentSubtestId?: string;
  currentIndex: number;
  /** Remaining seconds (global timer). */
  timeLeftSeconds: number;
  subtestProgress: SubtestProgress[];
  tabSwitchCount: number;
  result?: AttemptResult;
}

/* ------------------------------------------------------------------ */
/* Payments, vouchers, settings                                        */
/* ------------------------------------------------------------------ */

export type PaymentStatus = "pending" | "approved" | "rejected";
export type PaymentMethodKind = "bank" | "ewallet" | "qris";

export interface PaymentMethod {
  id: string;
  kind: PaymentMethodKind;
  name: string;
  accountNumber: string;
  accountName: string;
  /** QRIS static image or bank logo. */
  qrUrl?: string;
  instructions?: I18nText;
  active: boolean;
}

export interface Payment {
  id: string;
  invoiceCode: string;
  userId: string;
  packageId?: string;
  amount: number;
  /** 3-digit unique code added to the transfer amount. */
  uniqueCode: number;
  total: number;
  discount: number;
  voucherCode?: string;
  methodId: string;
  status: PaymentStatus;
  proofUrl?: string;
  proofFileName?: string;
  uploadedAt?: string;
  /** Rejection reason shown to the participant. */
  note?: string;
  createdAt: string;
  expiresAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface Voucher {
  id: string;
  code: string;
  type: "percent" | "amount";
  value: number;
  maxDiscount?: number;
  minAmount?: number;
  usageLimit: number | null;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  active: boolean;
  /** Empty → all packages. */
  packageIds: string[];
  description?: I18nText;
}

export interface AppSettings {
  brandName: string;
  tagline: I18nText;
  logoUrl?: string;
  contactEmail: string;
  contactWhatsapp: string;
  website: string;
  defaultLocale: Locale;
  timezone: string;
  paymentMethods: PaymentMethod[];
  /** Auto-approve payments (demo mode). */
  autoApprovePayments: boolean;
  maintenanceMode: boolean;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  targetType: string;
  targetId: string;
  message: I18nText;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

export interface Database {
  version: number;
  users: User[];
  categories: Category[];
  testTypes: TestType[];
  subtests: Subtest[];
  conversionTables: ConversionTable[];
  questions: Question[];
  packages: TryoutPackage[];
  sessions: Session[];
  attempts: Attempt[];
  payments: Payment[];
  vouchers: Voucher[];
  settings: AppSettings;
  activityLogs: ActivityLog[];
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

export interface QuestionScoreResult {
  /** Raw points earned for this question. */
  points: number;
  /** Maximum achievable points. */
  maxPoints: number;
  /** `null` when the question type is not objectively scorable (essay). */
  correct: boolean | null;
  /** Per-blank / per-pair detail for the review screen. */
  detail?: Record<string, boolean | number>;
  needsManualGrading?: boolean;
}
