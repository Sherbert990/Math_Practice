/**
 * categories.ts — TypeScript registry derived from CATEGORIES.md
 *
 * HOW TO ADD A NEW CATEGORY:
 *  1. Add a new entry to CATEGORIES.md following the documented format.
 *  2. Tell Manus: "Regenerate the website from CATEGORIES.md".
 *  3. Manus will add a new CategoryDef entry here and implement the generator.
 *
 * User overrides (label, sublabel, defaultDifficulty, difficultyParams, exampleQuestions)
 * are stored in localStorage via storage.ts and applied at runtime — no code changes needed.
 *
 * GROUPS:
 *  - "foundation": Hand-crafted categories with procedurally generated questions.
 *  - "amc8": Real AMC 8 problems (1999–2026) loaded from the static JSON asset.
 */
import type { LucideIcon } from "lucide-react";
import { Calculator, Shuffle, Sigma, Zap } from "lucide-react";
import type { Question, Difficulty } from "./mathGenerator";
import {
  generateLinearQuestion,
  generateCPQuestion,
  generateQuadraticQuestion,
  generateExponentQuestion,
} from "./mathGenerator";
import {
  loadCategoryConfig,
  loadGoalConfig,
  goalForCategory,
  type DifficultyParams,
} from "./storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export type { Difficulty };
export type GeneratorFn = (difficulty: Difficulty) => Question;

export interface FormulaRef {
  label: string;
  formula: string;
}

export interface TipItem {
  text: string;
}

export interface CategoryDef {
  /** Unique machine-readable key — matches CATEGORIES.md `id` field */
  id: string;
  /** Display name shown in the sidebar (may be overridden by user settings) */
  label: string;
  /** Short subtitle shown under the label (may be overridden by user settings) */
  sublabel: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** One-sentence description for the reference card header */
  description: string;
  /** Function that produces a new random question at the given difficulty */
  generate: GeneratorFn;
  /** Default difficulty for this category (may be overridden by user settings) */
  defaultDifficulty: Difficulty;
  /** Optional formula reference entries shown in the reference card */
  formulaRefs?: FormulaRef[];
  /** Optional quick-tip bullet points shown in the reference card */
  tips?: TipItem[];
}

/** A named group of categories shown together in the sidebar */
export interface CategoryGroup {
  /** Machine-readable group key */
  id: string;
  /** Display label for the group header */
  label: string;
  /** Categories belonging to this group */
  categories: CategoryDef[];
}

// ─── Base registry (code defaults — mirrors CATEGORIES.md) ───────────────────

const FOUNDATION_CATEGORIES: CategoryDef[] = [
  // ── 1. Linear Equations ──────────────────────────────────────────────────
  {
    id: "linear-equation",
    label: "Linear Equations",
    sublabel: "Solve for x",
    icon: Calculator,
    description:
      "One-variable linear equations with integer coefficients. Isolate x and enter the integer value.",
    generate: (difficulty: Difficulty) => {
      const overrides = getUserDifficultyParams("linear-equation", difficulty);
      return generateLinearQuestion(difficulty, overrides);
    },
    defaultDifficulty: "medium",
    tips: [
      { text: "Move all x terms to one side, constants to the other." },
      { text: "Distribute any parentheses first." },
      { text: "Divide both sides by the coefficient of x." },
    ],
  },
  // ── 2. Combinations & Permutations ───────────────────────────────────────
  {
    id: "combo-permu",
    label: "Combinations & Permutations",
    sublabel: "Word problems",
    icon: Shuffle,
    description:
      "Real-world word problems — decide whether order matters, then compute C(n,r) or P(n,r).",
    generate: (difficulty: Difficulty) => {
      const overrides = getUserDifficultyParams("combo-permu", difficulty);
      return generateCPQuestion(difficulty, overrides);
    },
    defaultDifficulty: "medium",
    formulaRefs: [
      {
        label: "Combination (order doesn't matter)",
        formula: "\\binom{n}{r} = \\dfrac{n!}{r!\\,(n-r)!}",
      },
      {
        label: "Permutation (order matters)",
        formula: "P(n,\\,r) = \\dfrac{n!}{(n-r)!}",
      },
    ],
  },
  // ── 3. Quadratic Equations ────────────────────────────────────────────────
  {
    id: "quadratic-equation",
    label: "Quadratic Equations",
    sublabel: "Find both roots",
    icon: Sigma,
    description:
      "Factor or use the quadratic formula to find both integer roots of ax² + bx + c = 0.",
    generate: (difficulty: Difficulty) => {
      const overrides = getUserDifficultyParams("quadratic-equation", difficulty);
      return generateQuadraticQuestion(difficulty, overrides) as Question;
    },
    defaultDifficulty: "medium",
    formulaRefs: [
      { label: "Quadratic formula", formula: "x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" },
      { label: "Factored form", formula: "a(x - r_1)(x - r_2) = 0 \\implies x = r_1 \\text{ or } r_2" },
      { label: "Sum of roots", formula: "r_1 + r_2 = -\\dfrac{b}{a}" },
      { label: "Product of roots", formula: "r_1 \\cdot r_2 = \\dfrac{c}{a}" },
    ],
    tips: [
      { text: "Try factoring first — look for two numbers that multiply to c and add to b." },
      { text: "If factoring is hard, apply the quadratic formula." },
      { text: "Always check both roots by substituting back into the equation." },
    ],
  },
  // ── 4. Exponents ─────────────────────────────────────────────────────────
  {
    id: "exponents",
    label: "Exponents",
    sublabel: "Laws of exponents",
    icon: Zap,
    description:
      "Apply exponent rules (product, quotient, power, zero, negative) to simplify or evaluate expressions.",
    generate: (difficulty: Difficulty) => {
      const overrides = getUserDifficultyParams("exponents", difficulty);
      return generateExponentQuestion(difficulty, overrides);
    },
    defaultDifficulty: "easy",
    formulaRefs: [
      { label: "Product rule", formula: "x^a \\cdot x^b = x^{a+b}" },
      { label: "Quotient rule", formula: "\\dfrac{x^a}{x^b} = x^{a-b}" },
      { label: "Power rule", formula: "(x^a)^b = x^{a \\cdot b}" },
      { label: "Zero exponent", formula: "x^0 = 1 \\quad (x \\neq 0)" },
      { label: "Negative exponent", formula: "x^{-a} = \\dfrac{1}{x^a}" },
    ],
    tips: [
      { text: "Product rule: add exponents when multiplying same base." },
      { text: "Quotient rule: subtract exponents when dividing same base." },
      { text: "Power rule: multiply exponents when raising a power to a power." },
      { text: "Any non-zero base to the power 0 equals 1." },
    ],
  },
];

/** Flat list of all Foundation categories for backwards compatibility */
const BASE_REGISTRY: CategoryDef[] = FOUNDATION_CATEGORIES;

/** Grouped structure: Foundation + AMC8 (AMC8 categories are injected at runtime from the JSON) */
export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: "foundation",
    label: "Foundation",
    categories: FOUNDATION_CATEGORIES,
  },
  // AMC8 group is populated at runtime by the useAMC8Data hook and injected via getEffectiveGroups()
  // Its id is "amc8" — kept as a placeholder here so the sidebar knows to render it.
  {
    id: "amc8",
    label: "AMC 8",
    categories: [], // populated at runtime
  },
];

// ─── User override helpers ────────────────────────────────────────────────────

/**
 * Returns the user-customized DifficultyParams for a given category + difficulty tier,
 * or undefined if no overrides are stored.
 */
function getUserDifficultyParams(
  catId: string,
  difficulty: Difficulty
): DifficultyParams | undefined {
  try {
    const store = loadCategoryConfig();
    return store[catId]?.difficultyParams?.[difficulty];
  } catch {
    return undefined;
  }
}

/**
 * Returns the CATEGORY_REGISTRY with user overrides applied (label, sublabel, defaultDifficulty).
 * Call this instead of importing CATEGORY_REGISTRY directly when rendering UI.
 */
export function getEffectiveRegistry(): CategoryDef[] {
  try {
    const store = loadCategoryConfig();
    return BASE_REGISTRY.map((cat) => {
      const override = store[cat.id];
      if (!override) return cat;
      return {
        ...cat,
        label: override.label ?? cat.label,
        sublabel: override.sublabel ?? cat.sublabel,
        defaultDifficulty: override.defaultDifficulty ?? cat.defaultDifficulty,
      };
    });
  } catch {
    return BASE_REGISTRY;
  }
}

/**
 * Returns the effective daily goal for a category, reading from localStorage.
 */
export function getEffectiveDailyGoal(catId: string): number {
  try {
    const config = loadGoalConfig();
    return goalForCategory(config, catId);
  } catch {
    return 10;
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * The base registry (code defaults). Use getEffectiveRegistry() in UI components
 * to get user-overridden values.
 */
export const CATEGORY_REGISTRY = BASE_REGISTRY;

/** The default category shown on first load */
export const DEFAULT_CATEGORY_ID = BASE_REGISTRY[0].id;

/** Look up a category by id. Throws if not found. */
export function getCategoryById(id: string): CategoryDef {
  const cat = BASE_REGISTRY.find((c) => c.id === id);
  if (!cat) throw new Error(`Category "${id}" not found in registry.`);
  return cat;
}
