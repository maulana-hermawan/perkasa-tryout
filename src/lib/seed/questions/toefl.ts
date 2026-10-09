import type { Question } from "@/types";
import { options, p, q, rich, ul } from "../helpers";

/* ============================ LISTENING ============================ */

const LISTENING: Question[] = [
  q({
    id: "q-toefl-lis-01",
    type: "listening",
    testTypeId: "tt-toefl",
    subtestId: "st-toefl-listening",
    difficulty: "medium",
    topics: ["Short Conversation"],
    tags: ["listening", "audio", "campus"],
    prompt: rich(
      p("Listen to the short conversation, then answer the question.") +
        p("<em>(Audio dapat diputar satu kali saja.)</em>"),
    ),
    audioUrl: "/audio/toefl-listening-01.wav",
    maxPlays: 1,
    allowSeek: false,
    transcript: rich(
      p(
        "<strong>Man:</strong> Excuse me, is the biology lab still open? <strong>Woman:</strong> It closes at five, but the technician locks the equipment room at four thirty. <strong>Man:</strong> Then I'd better hurry.",
      ),
    ),
    inner: {
      id: "q-toefl-lis-01-inner",
      type: "multiple-choice",
      testTypeId: "tt-toefl",
      subtestId: "st-toefl-listening",
      difficulty: "medium",
      topics: ["Short Conversation"],
      tags: ["listening", "audio"],
      prompt: rich(p("What does the woman imply?")),
      options: options([
        { key: "a", id: "The lab is already closed." },
        { key: "b", id: "The man should come back tomorrow." },
        { key: "c", id: "The man needs to be quick." },
        { key: "d", id: "The technician is waiting for him." },
      ]),
      correctOptionId: "c",
      createdAt: "2025-01-05T00:00:00.000Z",
      updatedAt: "2025-01-05T00:00:00.000Z",
    },
    explanation: rich(
      p("“Then I'd better hurry” — percakapan menyiratkan pria itu harus bergegas sebelum pukul 16.30."),
    ),
  }),
  q({
    id: "q-toefl-lis-02",
    type: "listening",
    testTypeId: "tt-toefl",
    subtestId: "st-toefl-listening",
    difficulty: "medium",
    topics: ["Short Talk"],
    tags: ["listening", "audio", "lecture"],
    prompt: rich(p("Listen to the short talk, then answer the question.")),
    audioUrl: "/audio/toefl-listening-02.wav",
    maxPlays: 1,
    allowSeek: false,
    transcript: rich(
      p(
        "<strong>Narrator:</strong> Today's lecture has been moved from Room 204 to the main auditorium. Please bring your laboratory manual; the handout will be distributed at the door.",
      ),
    ),
    inner: {
      id: "q-toefl-lis-02-inner",
      type: "multiple-choice",
      testTypeId: "tt-toefl",
      subtestId: "st-toefl-listening",
      difficulty: "easy",
      topics: ["Short Talk"],
      tags: ["listening", "audio"],
      prompt: rich(p("What does the speaker ask the listeners to bring?")),
      options: options([
        { key: "a", id: "A printed handout" },
        { key: "b", id: "Their laboratory manual" },
        { key: "c", id: "A notebook and pen" },
        { key: "d", id: "The course textbook" },
      ]),
      correctOptionId: "b",
      createdAt: "2025-01-05T00:00:00.000Z",
      updatedAt: "2025-01-05T00:00:00.000Z",
    },
    explanation: rich(p("“Please bring your laboratory manual” — handout justru dibagikan di pintu, jadi jawaban (b).")),
  }),
  q({
    id: "q-toefl-lis-03",
    type: "listening",
    testTypeId: "tt-toefl",
    subtestId: "st-toefl-listening",
    difficulty: "hard",
    topics: ["Longer Conversation"],
    tags: ["listening", "audio", "academic"],
    prompt: rich(p("Listen to the conversation, then answer the question.")),
    audioUrl: "/audio/toefl-listening-03.wav",
    maxPlays: 1,
    allowSeek: false,
    transcript: rich(
      p(
        "<strong>Advisor:</strong> You can still register for the field study, but the deadline is Friday. <strong>Student:</strong> Is the deposit refundable? <strong>Advisor:</strong> Only if the trip is cancelled by the department.",
      ),
    ),
    inner: {
      id: "q-toefl-lis-03-inner",
      type: "multiple-choice",
      testTypeId: "tt-toefl",
      subtestId: "st-toefl-listening",
      difficulty: "hard",
      topics: ["Longer Conversation"],
      tags: ["listening", "audio"],
      prompt: rich(p("When will the student get the deposit back?")),
      options: options([
        { key: "a", id: "Any time before Friday" },
        { key: "b", id: "If the department cancels the trip" },
        { key: "c", id: "After the field study ends" },
        { key: "d", id: "If she withdraws from the course" },
      ]),
      correctOptionId: "b",
      createdAt: "2025-01-05T00:00:00.000Z",
      updatedAt: "2025-01-05T00:00:00.000Z",
    },
    explanation: rich(p("“Only if the trip is cancelled by the department” → jawaban (b).")),
  }),
];

/* ============================ STRUCTURE ============================ */

const STRUCTURE: Question[] = [
  q({
    id: "q-toefl-str-01",
    type: "multiple-choice",
    testTypeId: "tt-toefl",
    subtestId: "st-toefl-structure",
    difficulty: "easy",
    topics: ["Subject-Verb Agreement"],
    tags: ["grammar"],
    prompt: rich(p("The committee members … meeting every Monday morning.")),
    options: options([
      { key: "a", id: "is" },
      { key: "b", id: "are" },
      { key: "c", id: "has been" },
      { key: "d", id: "was" },
    ]),
    correctOptionId: "b",
    explanation: rich(p("Subjek jamak “members” memerlukan kata kerja jamak “are”.")),
  }),
  q({
    id: "q-toefl-str-02",
    type: "multiple-choice",
    testTypeId: "tt-toefl",
    subtestId: "st-toefl-structure",
    difficulty: "medium",
    topics: ["Error Recognition"],
    tags: ["grammar", "error"],
    prompt: rich(p("Find the underlined part that is incorrect:") + p("<em>She <u>has went</u> <u>to</u> the library <u>three times</u> <u>this week</u>.</em>")),
    options: options([
      { key: "a", id: "has went" },
      { key: "b", id: "to" },
      { key: "c", id: "three times" },
      { key: "d", id: "this week" },
    ]),
    correctOptionId: "a",
    explanation: rich(p("Present perfect memakai past participle: “has gone”, bukan “has went”.")),
  }),
  q({
    id: "q-toefl-str-03",
    type: "multiple-choice",
    testTypeId: "tt-toefl",
    subtestId: "st-toefl-structure",
    difficulty: "medium",
    topics: ["Reduced Clause"],
    tags: ["grammar"],
    prompt: rich(p("… finished the report, Nina submitted it to the supervisor.")),
    options: options([
      { key: "a", id: "After" },
      { key: "b", id: "Having" },
      { key: "c", id: "Being" },
      { key: "d", id: "Since" },
    ]),
    correctOptionId: "b",
    explanation: rich(p("Partisipial “Having finished” menyatakan tindakan yang selesai lebih dahulu.")),
  }),
  q({
    id: "q-toefl-str-04",
    type: "multiple-choice",
    testTypeId: "tt-toefl",
    subtestId: "st-toefl-structure",
    difficulty: "hard",
    topics: ["Parallelism"],
    tags: ["grammar", "parallelism"],
    prompt: rich(p("The new policy requires every employee to be punctual, … and …")),
    options: options([
      { key: "a", id: "courteous — being productive" },
      { key: "b", id: "courteous — productive" },
      { key: "c", id: "courtesy — productive" },
      { key: "d", id: "being courteous — productive" },
    ]),
    correctOptionId: "b",
    explanation: rich(p("Kesejajaran bentuk: “punctual, courteous and productive” (semua adjektiva).")),
  }),
  q({
    id: "q-toefl-str-05",
    type: "multiple-choice",
    testTypeId: "tt-toefl",
    subtestId: "st-toefl-structure",
    difficulty: "medium",
    topics: ["Conditional"],
    tags: ["grammar", "conditional"],
    prompt: rich(p("If the team … the proposal earlier, the client would have approved it.")),
    options: options([
      { key: "a", id: "submitted" },
      { key: "b", id: "had submitted" },
      { key: "c", id: "would submit" },
      { key: "d", id: "submits" },
    ]),
    correctOptionId: "b",
    explanation: rich(p("Third conditional: “If + past perfect … would have + V3”.")),
  }),
];

/* ============================= READING ============================= */

const READING: Question[] = [
  q({
    id: "q-toefl-read-01",
    type: "multiple-choice",
    testTypeId: "tt-toefl",
    subtestId: "st-toefl-reading",
    difficulty: "medium",
    topics: ["Main Idea"],
    tags: ["reading", "vocabulary"],
    prompt: rich(
      p("Read the sentence and choose the best answer.") +
        p(
          "<em>“Although the archipelago's reefs cover less than one percent of the ocean floor, they shelter roughly a quarter of all marine species.”</em>",
        ) +
        p("The word <strong>shelter</strong> is closest in meaning to …"),
    ),
    options: options([
      { key: "a", id: "destroy" },
      { key: "b", id: "hide" },
      { key: "c", id: "protect" },
      { key: "d", id: "count" },
    ]),
    correctOptionId: "c",
    explanation: rich(p("“Shelter” dalam konteks ini berarti melindungi/menaungi (protect).")),
  }),
  q({
    id: "q-toefl-read-02",
    type: "multiple-choice",
    testTypeId: "tt-toefl",
    subtestId: "st-toefl-reading",
    difficulty: "hard",
    topics: ["Inference"],
    tags: ["reading", "inference"],
    prompt: rich(
      p(
        "<em>“The manuscript was dismissed by reviewers in 1903, yet a century later the same equations underpin modern fluid dynamics.”</em>",
      ) +
        p("What can be inferred from the sentence?"),
    ),
    options: options([
      { key: "a", id: "The reviewers were experts in fluid dynamics." },
      { key: "b", id: "The manuscript's value was recognised long after it was rejected." },
      { key: "c", id: "The equations were rewritten in 1903." },
      { key: "d", id: "Modern fluid dynamics ignores the manuscript." },
    ]),
    correctOptionId: "b",
    explanation: rich(p("Kontras “dismissed … yet a century later … underpin” menunjukkan pengakuan yang datang belakangan.")),
  }),
  q({
    id: "q-toefl-read-03",
    type: "multiple-choice",
    testTypeId: "tt-toefl",
    subtestId: "st-toefl-reading",
    difficulty: "medium",
    topics: ["Reference"],
    tags: ["reading", "reference"],
    prompt: rich(
      p(
        "<em>“Dr Hartono shipped the specimens to the laboratory, where they were catalogued by the assistant.”</em>",
      ) +
        p("The word <strong>they</strong> refers to …"),
    ),
    options: options([
      { key: "a", id: "Dr Hartono" },
      { key: "b", id: "the specimens" },
      { key: "c", id: "the laboratory" },
      { key: "d", id: "the assistant" },
    ]),
    correctOptionId: "b",
    explanation: rich(p("Kata ganti “they” merujuk pada “specimens” yang dikirim ke laboratorium.")),
  }),
  q({
    id: "q-toefl-read-04",
    type: "group",
    testTypeId: "tt-toefl",
    subtestId: "st-toefl-reading",
    difficulty: "medium",
    topics: ["Reading Passage"],
    tags: ["reading", "group", "stimulus"],
    prompt: rich(p("Questions 4–5 refer to the following passage.")),
    stimulus: {
      kind: "text",
      content: rich(
        p(
          "Coral bleaching occurs when rising sea temperatures stress the algae living inside coral tissue. The corals expel the algae, losing both their colour and their main source of energy. If the heat persists, the colony starves; if conditions recover within a few weeks, the algae can return and the reef may survive.",
        ) +
          ul([
            "Bleaching is triggered by prolonged heat stress.",
            "Algae provide corals with most of their energy.",
            "Recovery is possible when temperatures normalise quickly.",
          ]),
      ),
    },
    children: [
      {
        id: "q-toefl-read-04a",
        type: "multiple-choice",
        testTypeId: "tt-toefl",
        subtestId: "st-toefl-reading",
        difficulty: "medium",
        topics: ["Reading Passage"],
        tags: ["reading", "group"],
        prompt: rich(p("According to the passage, corals lose their colour because …")),
        options: options([
          { key: "a", id: "the water becomes too salty" },
          { key: "b", id: "they expel the algae living in their tissue" },
          { key: "c", id: "predators eat the outer layer" },
          { key: "d", id: "the algae change colour" },
        ]),
        correctOptionId: "b",
        createdAt: "2025-01-05T00:00:00.000Z",
        updatedAt: "2025-01-05T00:00:00.000Z",
      },
      {
        id: "q-toefl-read-04b",
        type: "multiple-choice",
        testTypeId: "tt-toefl",
        subtestId: "st-toefl-reading",
        difficulty: "hard",
        topics: ["Reading Passage"],
        tags: ["reading", "group"],
        prompt: rich(p("What determines whether a bleached colony survives?")),
        options: options([
          { key: "a", id: "How quickly the temperature returns to normal" },
          { key: "b", id: "The depth of the reef" },
          { key: "c", id: "The number of predators nearby" },
          { key: "d", id: "The salinity of the sea water" },
        ]),
        correctOptionId: "a",
        createdAt: "2025-01-05T00:00:00.000Z",
        updatedAt: "2025-01-05T00:00:00.000Z",
      },
    ],
    explanation: rich(
      p("Teks menyatakan pemutihan terjadi saat alga dikeluarkan, dan pemulihan bergantung pada cepatnya suhu kembali normal."),
    ),
  }),
];

export const TOEFL_QUESTIONS: Question[] = [...LISTENING, ...STRUCTURE, ...READING];
export const TOEFL_LISTENING_IDS = LISTENING.map((item) => item.id);
export const TOEFL_STRUCTURE_IDS = STRUCTURE.map((item) => item.id);
export const TOEFL_READING_IDS = READING.map((item) => item.id);
