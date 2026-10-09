import type { Question } from "@/types";
import { PSIKOTES_QUESTIONS } from "./psikotes";
import { SKD_QUESTIONS } from "./skd";
import { TOEFL_QUESTIONS } from "./toefl";
import { UMUM_QUESTIONS } from "./umum";

export { SKD_QUESTIONS } from "./skd";
export { TOEFL_QUESTIONS } from "./toefl";
export { PSIKOTES_QUESTIONS } from "./psikotes";
export { UMUM_QUESTIONS } from "./umum";

export const SEED_QUESTIONS: Question[] = [
  ...SKD_QUESTIONS,
  ...TOEFL_QUESTIONS,
  ...PSIKOTES_QUESTIONS,
  ...UMUM_QUESTIONS,
];
