export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export const managedFiles = [
  { fileName: "lessons", title: "Course lessons", singular: "lesson", detail: "Teacher-led lessons, listening, speaking, writing, and recap", accent: "blue", mark: "LE" },
  { fileName: "grammar", title: "Grammar", singular: "grammar topic", detail: "Rules, examples, common mistakes, and practice", accent: "coral", mark: "GR" },
  { fileName: "vocab_a1", title: "A1 vocabulary", singular: "word", detail: "Starter words, articles, plurals, examples, and audio", accent: "gold", mark: "A1" },
  { fileName: "vocab_a2", title: "A2 vocabulary", singular: "word", detail: "Everyday independent language and visual examples", accent: "green", mark: "A2" },
  { fileName: "vocab_b1", title: "B1 vocabulary", singular: "word", detail: "Integration, work, exam, and real-life vocabulary", accent: "blue", mark: "B1" },
  { fileName: "quizzes", title: "Quizzes", singular: "question", detail: "Questions, choices, correct answers, and explanations", accent: "coral", mark: "QZ" },
  { fileName: "practical_missions", title: "Real-life missions", singular: "mission", detail: "Voice role-play scenarios, model responses, and writing", accent: "green", mark: "RL" },
  { fileName: "everyday_phrases", title: "Everyday phrases", singular: "phrase category", detail: "Phrasebook categories and high-frequency expressions", accent: "gold", mark: "PH" },
] as const;

export type SupportedContentFile = (typeof managedFiles)[number]["fileName"];

export const supportedContentFiles = managedFiles.map((file) => file.fileName) as SupportedContentFile[];

export const itemTemplates: Record<SupportedContentFile, JsonObject> = {
  grammar: {
    id: "", level: "A1", order: 1, title: "", explanation: "",
    examples: [{ german: "", english: "" }],
    commonMistakes: [""],
    practice: [{ prompt: "", answer: "", explanation: "" }],
  },
  vocab_a1: vocabularyTemplate("A1"),
  vocab_a2: vocabularyTemplate("A2"),
  vocab_b1: vocabularyTemplate("B1"),
  lessons: {
    id: "", level: "A1", order: 1, title: "", scenario: "", vocabularyIds: [""], grammarTopicId: "",
    guidedPractice: [{ type: "multipleChoice", prompt: "", choices: ["", "", ""], answer: "", explanation: "" }],
    listening: { script: "", questions: [{ prompt: "", answer: "", explanation: "" }] },
    speaking: { prompt: "", expectedAnswer: "", requiredPhrases: [""], grammarMarkers: [""] },
    writing: { prompt: "", checklist: [""] }, recap: [""], xp: 20,
  },
  quizzes: {
    id: "", level: "A1", unitId: "", type: "multipleChoice", skill: "grammar", prompt: "",
    choices: ["", "", ""], correctAnswer: "", explanation: "",
  },
  practical_missions: {
    id: "", level: "A1", order: 1, title: "", setting: "", goal: "", partnerRole: "", icon: "person.2.fill",
    canDo: [""], phrases: [{ german: "", english: "" }],
    turns: [{ partnerCue: "", cueTranslation: "", modelResponse: "", responseTranslation: "", requiredPhrases: [""], grammarMarkers: [""] }],
    writingPrompt: "", writingChecklist: [""],
  },
  everyday_phrases: {
    id: "", title: "", subtitle: "", icon: "text.bubble.fill",
    phrases: [{ id: "", level: "A1", german: "", english: "" }],
  },
};

function vocabularyTemplate(level: string): JsonObject {
  return {
    id: "", level, theme: "", german: "", article: "", plural: "", english: "",
    exampleSentence: "", ttsText: "", difficultyTag: "core", exampleTranslation: "",
  };
}

export const fieldLabels: Record<string, string> = {
  id: "Unique ID", level: "CEFR level", order: "Teaching order", title: "Title", explanation: "Clear explanation",
  examples: "Example sentences", german: "German", english: "Teaching-language meaning", commonMistakes: "Common mistakes",
  practice: "Practice questions", prompt: "Prompt", answer: "Correct answer", theme: "Theme", article: "Article",
  plural: "Plural", exampleSentence: "German example sentence", exampleTranslation: "Sentence meaning", ttsText: "Audio text",
  difficultyTag: "Learning priority", scenario: "Real-life scenario", vocabularyIds: "Vocabulary IDs", grammarTopicId: "Grammar topic ID",
  guidedPractice: "Guided practice", type: "Exercise type", choices: "Answer choices", listening: "Listening practice", script: "Dialogue or audio script",
  questions: "Comprehension questions", speaking: "Speaking practice", expectedAnswer: "Model answer", requiredPhrases: "Required phrases",
  grammarMarkers: "Grammar markers", writing: "Writing practice", checklist: "Success checklist", recap: "Lesson recap", xp: "XP reward",
  unitId: "Unit ID", skill: "Skill", correctAnswer: "Correct answer", setting: "Setting", goal: "Learning goal",
  partnerRole: "Conversation partner", icon: "SF Symbol icon", canDo: "Learner can do", phrases: "Useful phrases",
  turns: "Conversation turns", partnerCue: "Partner says", cueTranslation: "Meaning", modelResponse: "Model response",
  responseTranslation: "Response meaning", writingPrompt: "Writing follow-up", writingChecklist: "Writing checklist", subtitle: "Short description",
};

export const fieldHelp: Record<string, string> = {
  id: "Stable and unique. Existing learner progress is connected to this value.",
  order: "Lower numbers appear earlier in the learning journey.",
  level: "Controls where the content appears in A1, A2, or B1.",
  ttsText: "The exact German text spoken by the app.",
  vocabularyIds: "Use IDs from the matching vocabulary level.",
  grammarTopicId: "Use the unique ID of the grammar topic taught in this lesson.",
  correctAnswer: "Must exactly match one of the answer choices.",
  icon: "Use an Apple SF Symbol name, for example cart.fill or briefcase.fill.",
};

export const selectOptions: Record<string, string[]> = {
  level: ["A1", "A2", "B1"],
  article: ["", "der", "die", "das"],
  difficultyTag: ["core", "useful", "challenge"],
  type: ["multipleChoice", "fillBlank", "matching", "listeningComprehension", "sentenceReorder"],
  skill: ["grammar", "vocabulary", "listening", "reading", "writing", "speaking"],
};

const requiredTopLevel: Record<SupportedContentFile, string[]> = {
  grammar: ["id", "level", "title", "explanation", "examples", "commonMistakes", "practice"],
  vocab_a1: vocabularyRequired(), vocab_a2: vocabularyRequired(), vocab_b1: vocabularyRequired(),
  lessons: ["id", "level", "title", "scenario", "vocabularyIds", "grammarTopicId", "guidedPractice", "listening", "speaking", "writing", "recap", "xp"],
  quizzes: ["id", "level", "unitId", "type", "skill", "prompt", "choices", "correctAnswer", "explanation"],
  practical_missions: ["id", "level", "title", "setting", "goal", "partnerRole", "icon", "canDo", "phrases", "turns", "writingPrompt", "writingChecklist"],
  everyday_phrases: ["id", "title", "subtitle", "icon", "phrases"],
};

function vocabularyRequired() {
  return ["id", "level", "theme", "german", "article", "plural", "english", "exampleSentence", "exampleTranslation", "ttsText", "difficultyTag"];
}

export function isSupportedContentFile(value: string): value is SupportedContentFile {
  return supportedContentFiles.includes(value as SupportedContentFile);
}

export function validateContentCollection(fileName: SupportedContentFile, parsed: unknown): JsonObject[] {
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Keep at least one item in this section before publishing.");
  const items = parsed as JsonObject[];
  items.forEach((item, index) => validateItem(fileName, item, index));
  const ids = items.map((item) => String(item.id ?? "").trim());
  if (new Set(ids).size !== ids.length) throw new Error("Two items use the same unique ID. Give each item a different ID.");

  if (fileName === "everyday_phrases") {
    const phraseIds = items.flatMap((item) => Array.isArray(item.phrases) ? item.phrases.map((phrase) => String((phrase as JsonObject).id ?? "")) : []);
    if (new Set(phraseIds).size !== phraseIds.length) throw new Error("Every everyday phrase needs a unique ID across all categories.");
  }
  validateCollectionQuality(fileName, items);
  return items;
}

function validateCollectionQuality(fileName: SupportedContentFile, items: JsonObject[]) {
  if (fileName.startsWith("vocab_")) {
    assertUniqueText(items, "exampleSentence", "German example sentences");
    for (const item of items) {
      const id = String(item.id);
      const example = normalizedText(item.exampleSentence);
      const translation = normalizedText(item.exampleTranslation);
      if (example.split(" ").length < 4) throw new Error(`${id} needs a complete real-life example sentence.`);
      if (translation.split(" ").length < 3) throw new Error(`${id} needs a complete example meaning.`);
      if (String(item.german).trim().includes(" ") === false && String(item.ttsText).trim().length < 2) {
        throw new Error(`${id} needs valid German audio text.`);
      }
    }
  }

  if (fileName === "grammar") {
    for (const item of items) {
      const id = String(item.id);
      if ((item.examples as JsonValue[]).length < 2) throw new Error(`${id} needs at least two distinct examples.`);
      if ((item.practice as JsonValue[]).length < 9) throw new Error(`${id} needs at least nine varied exercises.`);
      const prompts = (item.practice as JsonObject[]).map((exercise) => normalizedText(exercise.prompt));
      if (new Set(prompts).size !== prompts.length) throw new Error(`${id} repeats a grammar exercise prompt.`);
    }
  }

  if (fileName === "lessons") {
    assertUniqueText(items, "scenario", "lesson scenarios");
    for (const item of items) {
      const id = String(item.id);
      const minimumPractice = item.level === "B1" ? 8 : 7;
      if ((item.guidedPractice as JsonValue[]).length < minimumPractice) {
        throw new Error(`${id} needs at least ${minimumPractice} guided exercises.`);
      }
      const listening = item.listening as JsonObject;
      if (!Array.isArray(listening.questions) || listening.questions.length < 2) {
        throw new Error(`${id} needs at least two listening checks.`);
      }
      const speaking = item.speaking as JsonObject;
      if (!Array.isArray(speaking.requiredPhrases) || speaking.requiredPhrases.length < 2) {
        throw new Error(`${id} needs at least two speaking targets.`);
      }
      const writing = item.writing as JsonObject;
      if (!Array.isArray(writing.checklist) || writing.checklist.length < 3) {
        throw new Error(`${id} needs a practical writing checklist.`);
      }
    }
  }

  if (fileName === "practical_missions") {
    assertUniqueText(items, "setting", "real-life mission settings");
    for (const item of items) {
      const id = String(item.id);
      if ((item.turns as JsonValue[]).length < 3) throw new Error(`${id} needs at least three conversation turns.`);
      if ((item.phrases as JsonValue[]).length < 3) throw new Error(`${id} needs at least three reusable phrases.`);
      if ((item.canDo as JsonValue[]).length < 2) throw new Error(`${id} needs at least two learner outcomes.`);
    }
  }

  if (fileName === "everyday_phrases") {
    const phrases = items.flatMap((item) => item.phrases as JsonObject[]);
    const german = phrases.map((phrase) => normalizedText(phrase.german));
    if (new Set(german).size !== german.length) throw new Error("Everyday phrases must not repeat the same German sentence.");
  }
}

function assertUniqueText(items: JsonObject[], key: string, label: string) {
  const values = items.map((item) => normalizedText(item[key]));
  if (new Set(values).size !== values.length) throw new Error(`Published ${label} must be distinct.`);
}

function normalizedText(value: JsonValue | undefined) {
  return String(value ?? "").trim().toLocaleLowerCase("de-DE").replace(/\s+/g, " ");
}

function validateItem(fileName: SupportedContentFile, item: JsonObject, index: number) {
  if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`Item ${index + 1} is not a valid record.`);
  validateShape(itemTemplates[fileName], item, `Item ${index + 1}`);
  for (const key of requiredTopLevel[fileName]) {
    if (!(key in item)) throw new Error(`Item ${index + 1} is missing ${fieldLabels[key] ?? key}.`);
    const value = item[key];
    if (typeof value === "string" && value.trim() === "" && !["article", "plural"].includes(key)) {
      throw new Error(`Item ${index + 1} needs ${fieldLabels[key] ?? key}.`);
    }
  }
  const id = String(item.id ?? "").trim();
  if (!id) throw new Error(`Item ${index + 1} needs a unique ID.`);
  if ("level" in item && !selectOptions.level.includes(String(item.level))) throw new Error(`${id} has an unsupported CEFR level.`);

  if (fileName.startsWith("vocab_") && String(item.level).toLowerCase() !== fileName.slice(-2)) {
    throw new Error(`${id} must stay in ${fileName.slice(-2).toUpperCase()} vocabulary.`);
  }
  if (fileName === "quizzes") {
    const choices = item.choices;
    if (!Array.isArray(choices) || choices.length < 2) throw new Error(`${id} needs at least two answer choices.`);
    if (!choices.includes(item.correctAnswer)) throw new Error(`${id}'s correct answer must exactly match one answer choice.`);
  }
  if (fileName === "lessons") {
    const exercises = item.guidedPractice as JsonObject[];
    exercises.forEach((exercise, exerciseIndex) => {
      if (!Array.isArray(exercise.choices) || exercise.choices.length < 2) {
        throw new Error(`${id}, guided exercise ${exerciseIndex + 1}, needs at least two answer choices.`);
      }
      if (!exercise.choices.includes(exercise.answer)) {
        throw new Error(`${id}, guided exercise ${exerciseIndex + 1}, has an answer that does not match its choices.`);
      }
    });
  }
  if (fileName === "everyday_phrases") {
    if (!Array.isArray(item.phrases) || item.phrases.length === 0) throw new Error(`${id} needs at least one phrase.`);
    item.phrases.forEach((phrase, phraseIndex) => {
      const record = phrase as JsonObject;
      for (const key of ["id", "level", "german", "english"]) {
        if (typeof record?.[key] !== "string" || String(record[key]).trim() === "") {
          throw new Error(`${id}, phrase ${phraseIndex + 1}, needs ${fieldLabels[key] ?? key}.`);
        }
      }
    });
  }
}

function validateShape(template: JsonValue, value: JsonValue | undefined, context: string) {
  if (Array.isArray(template)) {
    if (!Array.isArray(value) || value.length === 0) throw new Error(`${context} needs at least one entry.`);
    if (template.length) value.forEach((entry, index) => validateShape(template[0], entry, `${context}, entry ${index + 1}`));
    return;
  }
  if (template && typeof template === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${context} has an incomplete section.`);
    for (const [key, childTemplate] of Object.entries(template)) {
      if (!(key in value)) throw new Error(`${context} is missing ${fieldLabels[key] ?? key}.`);
      const child = (value as JsonObject)[key];
      if (child === null && ["article", "plural"].includes(key)) continue;
      validateShape(childTemplate, child, `${context}, ${fieldLabels[key] ?? key}`);
    }
    return;
  }
  if (typeof value !== typeof template) throw new Error(`${context} has the wrong kind of value.`);
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error(`${context} must be a valid number.`);
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
