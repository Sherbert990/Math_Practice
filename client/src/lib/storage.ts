/**
 * storage.ts — localStorage data layer
 *
 * Persists three things:
 *   1. DailyRecord      — per-day, per-category attempted/correct counts
 *   2. GoalConfig       — per-category daily goals (problems per day)
 *   3. CategoryConfig   — user overrides for category settings
 *                         (label, sublabel, defaultDifficulty, difficultyParams, exampleQuestions)
 *
 * All keys are namespaced under "mathpractice:" to avoid collisions.
 */

import { CATEGORY_REGISTRY } from "./categories";
import type { Difficulty } from "./categories";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Stats for one category on one day */
export interface CategoryStat {
  attempted: number;
  correct: number;
}

/** A full day's record: date string (YYYY-MM-DD) → per-category stats */
export interface DailyRecord {
  date: string;
  categories: Record<string, CategoryStat>;
}

/**
 * Per-category daily goals.
 * Key = category id, value = number of problems to complete per day.
 * "__default__" is used as fallback for any category not explicitly listed.
 */
export type CategoryGoals = Record<string, number>;

export interface GoalConfig {
  categoryGoals: CategoryGoals;
}

/**
 * Difficulty parameter overrides for a single category tier.
 * All fields are optional — only the ones the user changed are stored.
 */
export interface DifficultyParams {
  // Linear equation params
  coeffMin?: number;
  coeffMax?: number;
  constMin?: number;
  constMax?: number;
  xMin?: number;
  xMax?: number;
  // Combo/permu params
  nMin?: number;
  nMax?: number;
  rMin?: number;
  rMax?: number;
  // Quadratic params
  aMin?: number;
  aMax?: number;
  rootMin?: number;
  rootMax?: number;
}

/** An example question shown as a calibration anchor in the Settings page */
export interface ExampleQuestion {
  question: string;
  answer: string;
}

/** User-editable settings for one category */
export interface CategoryOverride {
  /** Category id — must match an entry in CATEGORY_REGISTRY */
  id: string;
  /** Display label override */
  label?: string;
  /** Sublabel override */
  sublabel?: string;
  /** Default difficulty override */
  defaultDifficulty?: Difficulty;
  /** Per-difficulty param overrides */
  difficultyParams?: Partial<Record<Difficulty, DifficultyParams>>;
  /** Example questions per difficulty (used as calibration anchors) */
  exampleQuestions?: Partial<Record<Difficulty, ExampleQuestion>>;
}

/** Full category config store — one entry per category */
export type CategoryConfigStore = Record<string, CategoryOverride>;

// ─── Storage keys ─────────────────────────────────────────────────────────────

const RECORDS_KEY = "mathpractice:daily_records";
const GOAL_KEY = "mathpractice:goal_config";
const CAT_CONFIG_KEY = "mathpractice:category_config";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Goal config ──────────────────────────────────────────────────────────────

const DEFAULT_GOAL_PER_CATEGORY = 10;

export function buildDefaultGoalConfig(): GoalConfig {
  return {
    categoryGoals: Object.fromEntries([
      ["__default__", DEFAULT_GOAL_PER_CATEGORY],
      ...CATEGORY_REGISTRY.map((c) => [c.id, DEFAULT_GOAL_PER_CATEGORY]),
    ]),
  };
}

export function goalForCategory(config: GoalConfig, categoryId: string): number {
  return (
    config.categoryGoals[categoryId] ??
    config.categoryGoals["__default__"] ??
    DEFAULT_GOAL_PER_CATEGORY
  );
}

export function loadGoalConfig(): GoalConfig {
  const raw = readJSON<Record<string, unknown>>(GOAL_KEY, {});

  // Backward-compat: old format had `dailyGoal: number`
  if (typeof raw["dailyGoal"] === "number" && !raw["categoryGoals"]) {
    const legacy = raw["dailyGoal"] as number;
    const migrated: GoalConfig = {
      categoryGoals: Object.fromEntries([
        ["__default__", legacy],
        ...CATEGORY_REGISTRY.map((c) => [c.id, legacy]),
      ]),
    };
    saveGoalConfig(migrated);
    return migrated;
  }

  if (raw["categoryGoals"] && typeof raw["categoryGoals"] === "object") {
    const config = raw as unknown as GoalConfig;
    let dirty = false;
    for (const cat of CATEGORY_REGISTRY) {
      if (!(cat.id in config.categoryGoals)) {
        config.categoryGoals[cat.id] =
          config.categoryGoals["__default__"] ?? DEFAULT_GOAL_PER_CATEGORY;
        dirty = true;
      }
    }
    if (dirty) saveGoalConfig(config);
    return config;
  }

  const fresh = buildDefaultGoalConfig();
  saveGoalConfig(fresh);
  return fresh;
}

export function saveGoalConfig(config: GoalConfig): void {
  writeJSON(GOAL_KEY, config);
}

// ─── Category config ──────────────────────────────────────────────────────────

export function loadCategoryConfig(): CategoryConfigStore {
  return readJSON<CategoryConfigStore>(CAT_CONFIG_KEY, {});
}

export function saveCategoryConfig(store: CategoryConfigStore): void {
  writeJSON(CAT_CONFIG_KEY, store);
}

export function getCategoryOverride(id: string): CategoryOverride | undefined {
  const store = loadCategoryConfig();
  return store[id];
}

export function setCategoryOverride(override: CategoryOverride): void {
  const store = loadCategoryConfig();
  store[override.id] = override;
  saveCategoryConfig(store);
}

export function resetCategoryOverride(id: string): void {
  const store = loadCategoryConfig();
  delete store[id];
  saveCategoryConfig(store);
}

export function resetAllCategoryOverrides(): void {
  saveCategoryConfig({});
}

// ─── Daily records ────────────────────────────────────────────────────────────

export function loadAllRecords(): DailyRecord[] {
  return readJSON<DailyRecord[]>(RECORDS_KEY, []);
}

function saveAllRecords(records: DailyRecord[]): void {
  writeJSON(RECORDS_KEY, records);
}

export function getTodayRecord(): DailyRecord {
  const records = loadAllRecords();
  const today = todayStr();
  const existing = records.find((r) => r.date === today);
  if (existing) return existing;
  return {
    date: today,
    categories: Object.fromEntries(
      CATEGORY_REGISTRY.map((c) => [c.id, { attempted: 0, correct: 0 }])
    ),
  };
}

export function recordAnswer(categoryId: string, isCorrect: boolean): void {
  const records = loadAllRecords();
  const today = todayStr();
  let record = records.find((r) => r.date === today);

  if (!record) {
    record = {
      date: today,
      categories: Object.fromEntries(
        CATEGORY_REGISTRY.map((c) => [c.id, { attempted: 0, correct: 0 }])
      ),
    };
    records.push(record);
  }

  if (!record.categories[categoryId]) {
    record.categories[categoryId] = { attempted: 0, correct: 0 };
  }

  record.categories[categoryId].attempted += 1;
  if (isCorrect) record.categories[categoryId].correct += 1;

  records.sort((a, b) => b.date.localeCompare(a.date));
  saveAllRecords(records);
}

export function totalAttempted(record: DailyRecord): number {
  return Object.values(record.categories).reduce((s, c) => s + c.attempted, 0);
}

export function totalCorrect(record: DailyRecord): number {
  return Object.values(record.categories).reduce((s, c) => s + c.correct, 0);
}
