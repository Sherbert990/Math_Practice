/**
 * mathGenerator.ts — Question generators (KaTeX-enabled)
 *
 * All `equation`, `solution`, and `hint` fields now use LaTeX notation.
 * - `equation` is a pure LaTeX string rendered with <BlockMath>
 * - `solution`  is a newline-separated string; each line is a LaTeX expression
 *   wrapped in $...$ for inline rendering via <MathLines>
 * - `hint` may contain inline $...$ math fragments
 *
 * Difficulty tiers are calibrated against the example questions in CATEGORIES.md:
 *
 *   Linear Equations
 *     easy:   3x = 12  (one-step, small positive numbers)
 *     medium: 2(x − 3) = 4x + 6  (two-step, negatives, parentheses)
 *     hard:   5(2x − 7) = 3x + 14  (multi-step, larger coefficients)
 *
 *   Combinations & Permutations
 *     easy:   C(5,2) = 10  (n ≤ 7, r = 2, small result)
 *     medium: P(8,3) = 336  (n ≤ 12, r ≤ 4)
 *     hard:   P(15,5) = 360360  (n ≤ 20, r ≤ 6)
 *
 *   Quadratic Equations
 *     easy:   x²−3x+2=0  (monic, roots ∈ [−4,4])
 *     medium: 2x²−2x−12=0  (a ≤ 4, roots ∈ [−8,8])
 *     hard:   3x²−3x−36=0  (a ≤ 6, roots ∈ [−12,12])
 */

import type { DifficultyParams } from "./storage";
import { getRandomExponentProblem } from "./exponentProblems";

export type Difficulty = "easy" | "medium" | "hard";

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface Question {
  id: string;
  text: string;
  equation?: string;   // LaTeX string for BlockMath
  answer: number;
  solution: string;    // newline-separated lines, each may contain $...$ math
  hint: string;        // may contain $...$ inline math
}

export interface QuadraticQuestion extends Question {
  answer2: number;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randNonZero(min: number, max: number): number {
  let v = 0;
  while (v === 0) v = randInt(min, max);
  return v;
}

// ─── LaTeX helpers ────────────────────────────────────────────────────────────

/** Render a coefficient·x term in LaTeX, e.g. 1→"x", -1→"-x", 3→"3x" */
function coeffX(a: number): string {
  if (a === 1) return "x";
  if (a === -1) return "-x";
  return `${a}x`;
}

/** Render a signed constant as a LaTeX addend, e.g. 3→" + 3", -3→" - 3", 0→"" */
function signedConst(b: number): string {
  if (b === 0) return "";
  return b > 0 ? ` + ${b}` : ` - ${Math.abs(b)}`;
}

/** Render a signed coefficient·x term as an addend, e.g. 3→" + 3x", -3→" - 3x" */
function signedCoeffX(a: number): string {
  if (a === 0) return "";
  if (a === 1) return " + x";
  if (a === -1) return " - x";
  return a > 0 ? ` + ${a}x` : ` - ${Math.abs(a)}x`;
}

/** Render a fraction in LaTeX: \frac{ax}{b} */
function fracTerm(a: number, b: number): string {
  const num = a === 1 ? "x" : a === -1 ? "-x" : `${a}x`;
  return `\\dfrac{${num}}{${b}}`;
}

/** Render a signed root factor: (x - r) or (x + |r|) */
function rootFactor(r: number): string {
  if (r === 0) return "x";
  return r > 0 ? `(x - ${r})` : `(x + ${Math.abs(r)})`;
}

/** Format a number with sign for display in solutions */
function showNum(n: number): string {
  return `${n}`;
}

// ─── Default difficulty param tables ─────────────────────────────────────────

const LINEAR_DEFAULTS: Record<Difficulty, Required<Pick<DifficultyParams, "coeffMin"|"coeffMax"|"constMin"|"constMax"|"xMin"|"xMax">>> = {
  easy:   { coeffMin: 1,   coeffMax: 5,   constMin: 1,   constMax: 10,  xMin: 1,   xMax: 10  },
  medium: { coeffMin: -6,  coeffMax: 6,   constMin: -10, constMax: 10,  xMin: -10, xMax: 10  },
  hard:   { coeffMin: -12, coeffMax: 12,  constMin: -20, constMax: 20,  xMin: -15, xMax: 15  },
};

const CP_DEFAULTS: Record<Difficulty, Required<Pick<DifficultyParams, "nMin"|"nMax"|"rMin"|"rMax">>> = {
  easy:   { nMin: 4,  nMax: 7,  rMin: 2, rMax: 2 },
  medium: { nMin: 5,  nMax: 12, rMin: 2, rMax: 4 },
  hard:   { nMin: 10, nMax: 20, rMin: 3, rMax: 6 },
};

const QUAD_DEFAULTS: Record<Difficulty, Required<Pick<DifficultyParams, "aMin"|"aMax"|"rootMin"|"rootMax">>> = {
  easy:   { aMin: 1, aMax: 1, rootMin: -4,  rootMax: 4  },
  medium: { aMin: 1, aMax: 4, rootMin: -8,  rootMax: 8  },
  hard:   { aMin: 2, aMax: 6, rootMin: -12, rootMax: 12 },
};

const LINEAR_FORMS: Record<Difficulty, string[]> = {
  easy:   ["simple"],
  medium: ["simple", "two-sided", "parentheses", "fraction"],
  hard:   ["two-sided", "parentheses", "fraction"],
};

const QUAD_FORMS: Record<Difficulty, string[]> = {
  easy:   ["factored-monic", "difference-squares"],
  medium: ["factored-monic", "factored-scaled", "perfect-square", "difference-squares"],
  hard:   ["factored-scaled", "perfect-square"],
};

// ─── Generator: linear-equation ──────────────────────────────────────────────

export function generateLinearQuestion(
  difficulty: Difficulty = "medium",
  overrides?: DifficultyParams
): Question {
  const base = LINEAR_DEFAULTS[difficulty];
  const p = { ...base, ...overrides };
  const x = randInt(p.xMin, p.xMax);
  const form = pick(LINEAR_FORMS[difficulty]);

  // ── simple: ax + b = c ────────────────────────────────────────────────────
  if (form === "simple") {
    const a = randNonZero(p.coeffMin, p.coeffMax);
    const b = randInt(p.constMin, p.constMax);
    const c = a * x + b;
    const lhs = `${coeffX(a)}${signedConst(b)}`;
    return {
      id: uid(),
      text: "Solve for $x$:",
      equation: `${lhs} = ${c}`,
      answer: x,
      solution: [
        `$${lhs} = ${c}$`,
        b !== 0 ? `$${coeffX(a)} = ${c - b}$` : null,
        `$x = ${x}$`,
      ].filter(Boolean).join("\n"),
      hint: b !== 0
        ? `Subtract $${b}$ from both sides, then divide both sides by $${a}$.`
        : `Divide both sides by $${a}$.`,
    };
  }

  // ── two-sided: ax + b = cx + d ────────────────────────────────────────────
  if (form === "two-sided") {
    const a = randNonZero(p.coeffMin, p.coeffMax);
    let c = randNonZero(p.coeffMin, p.coeffMax);
    while (c === a) c = randNonZero(p.coeffMin, p.coeffMax);
    const b = randInt(p.constMin, p.constMax);
    const d = (a - c) * x + b;
    const lhs = `${coeffX(a)}${signedConst(b)}`;
    const rhs = `${coeffX(c)}${signedConst(d)}`;
    const coeff = a - c;
    const constant = d - b;
    return {
      id: uid(),
      text: "Solve for $x$:",
      equation: `${lhs} = ${rhs}`,
      answer: x,
      solution: [
        `$${lhs} = ${rhs}$`,
        `Move $x$ terms: $${coeff}x = ${constant}$`,
        `$x = ${x}$`,
      ].join("\n"),
      hint: `Move all $x$ terms to one side: subtract $${coeffX(c)}$ from both sides.`,
    };
  }

  // ── parentheses: a(x + b) = c ─────────────────────────────────────────────
  if (form === "parentheses") {
    const a = randNonZero(p.coeffMin, p.coeffMax);
    const b = randInt(p.constMin, p.constMax);
    const c = a * (x + b);
    const inner = b === 0 ? "x" : b > 0 ? `x + ${b}` : `x - ${Math.abs(b)}`;
    const aPrefix = a === 1 ? "" : a === -1 ? "-" : `${a}`;
    const expanded = `${coeffX(a)}${signedConst(a * b)}`;
    return {
      id: uid(),
      text: "Solve for $x$:",
      equation: `${aPrefix}(${inner}) = ${c}`,
      answer: x,
      solution: [
        `$${aPrefix}(${inner}) = ${c}$`,
        `Distribute: $${expanded} = ${c}$`,
        `$${coeffX(a)} = ${c - a * b}$`,
        `$x = ${x}$`,
      ].join("\n"),
      hint: `Distribute $${a}$ across the parentheses first, then isolate $x$.`,
    };
  }

  // ── fraction: ax/b + c = d ────────────────────────────────────────────────
  const bFrac = randNonZero(2, Math.min(6, Math.abs(p.coeffMax)));
  const a = randNonZero(p.coeffMin, p.coeffMax);
  const c = randInt(p.constMin, p.constMax);
  const safeX = bFrac * randInt(Math.ceil(p.xMin / bFrac), Math.floor(p.xMax / bFrac));
  const safeD = (a * safeX) / bFrac + c;
  const fracStr = fracTerm(a, bFrac);
  const lhsFrac = `${fracStr}${signedConst(c)}`;
  return {
    id: uid(),
    text: "Solve for $x$:",
    equation: `${lhsFrac} = ${safeD}`,
    answer: safeX,
    solution: [
      `$${lhsFrac} = ${safeD}$`,
      c !== 0 ? `$${fracStr} = ${safeD - c}$` : null,
      `$${coeffX(a)} = ${(safeD - c) * bFrac}$`,
      `$x = ${safeX}$`,
    ].filter(Boolean).join("\n"),
    hint: c !== 0
      ? `Subtract $${c}$ from both sides, then multiply both sides by $${bFrac}$.`
      : `Multiply both sides by $${bFrac}$.`,
  };
}

// ─── Generator: combo-permu ───────────────────────────────────────────────────

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function combination(n: number, r: number): number {
  return Math.round(factorial(n) / (factorial(r) * factorial(n - r)));
}

function permutation(n: number, r: number): number {
  return Math.round(factorial(n) / factorial(n - r));
}

/** LaTeX for C(n,r) */
function latexC(n: number, r: number): string {
  return `\\dbinom{${n}}{${r}}`;
}

/** LaTeX for P(n,r) */
function latexP(n: number, r: number): string {
  return `P(${n},\\,${r})`;
}

const CP_SCENARIOS: Array<{
  type: "combination" | "permutation";
  template: (n: number, r: number) => { text: string; hint: string; solution: string };
}> = [
  {
    type: "combination",
    template: (n, r) => ({
      text: `A teacher wants to select ${r} students from a class of ${n} to form a study group. How many different groups can be formed?`,
      hint: `Since the order of selection doesn't matter, use the combination formula $${latexC(n, r)}$.`,
      solution: [
        `Order doesn't matter (it's a group), so use combinations.`,
        `$${latexC(n, r)} = \\dfrac{${n}!}{${r}! \\cdot ${n - r}!} = ${combination(n, r)}$`,
      ].join("\n"),
    }),
  },
  {
    type: "combination",
    template: (n, r) => ({
      text: `A pizza shop offers ${n} different toppings. A customer wants to choose ${r} toppings for their pizza. How many different topping combinations are possible?`,
      hint: `The order of toppings doesn't matter, so use combinations: $${latexC(n, r)}$.`,
      solution: [
        `Order doesn't matter (toppings on a pizza), so use combinations.`,
        `$${latexC(n, r)} = \\dfrac{${n}!}{${r}! \\cdot ${n - r}!} = ${combination(n, r)}$`,
      ].join("\n"),
    }),
  },
  {
    type: "combination",
    template: (n, r) => ({
      text: `A committee of ${r} people is to be chosen from a group of ${n} volunteers. How many different committees are possible?`,
      hint: `Committee members have equal standing, so order doesn't matter. Use $${latexC(n, r)}$.`,
      solution: [
        `A committee has no ranked positions, so order doesn't matter. Use combinations.`,
        `$${latexC(n, r)} = \\dfrac{${n}!}{${r}! \\cdot ${n - r}!} = ${combination(n, r)}$`,
      ].join("\n"),
    }),
  },
  {
    type: "combination",
    template: (n, r) => ({
      text: `A bookshelf has ${n} different books. You want to pick ${r} books to take on a trip. How many ways can you choose the books?`,
      hint: `Choosing which books to bring (not their order) means combinations: $${latexC(n, r)}$.`,
      solution: [
        `You're just choosing which books to take, not arranging them. Use combinations.`,
        `$${latexC(n, r)} = \\dfrac{${n}!}{${r}! \\cdot ${n - r}!} = ${combination(n, r)}$`,
      ].join("\n"),
    }),
  },
  {
    type: "combination",
    template: (n, r) => ({
      text: `A bag contains ${n} different colored marbles. You randomly draw ${r} marbles. How many different sets of marbles could you draw?`,
      hint: `A set of drawn marbles is unordered, so use $${latexC(n, r)}$.`,
      solution: [
        `A drawn set is unordered, so use combinations.`,
        `$${latexC(n, r)} = \\dfrac{${n}!}{${r}! \\cdot ${n - r}!} = ${combination(n, r)}$`,
      ].join("\n"),
    }),
  },
  {
    type: "permutation",
    template: (n, r) => ({
      text: `In a race with ${n} runners, how many different ways can the top ${r} finishing positions be awarded?`,
      hint: `The finishing positions are ranked, so order matters. Use $${latexP(n, r)}$.`,
      solution: [
        `Order matters (1st, 2nd, 3rd are different), so use permutations.`,
        `$${latexP(n, r)} = \\dfrac{${n}!}{(${n} - ${r})!} = ${permutation(n, r)}$`,
      ].join("\n"),
    }),
  },
  {
    type: "permutation",
    template: (n, r) => ({
      text: `A club has ${n} members. They need to fill ${r} distinct officer roles (e.g. President, Vice-President, Secretary). How many different ways can these roles be assigned?`,
      hint: `The roles are distinct (President $\\neq$ Vice-President), so order matters. Use $${latexP(n, r)}$.`,
      solution: [
        `Each role is distinct (order matters), so use permutations.`,
        `$${latexP(n, r)} = \\dfrac{${n}!}{(${n} - ${r})!} = ${permutation(n, r)}$`,
      ].join("\n"),
    }),
  },
  {
    type: "permutation",
    template: (n, r) => ({
      text: `How many different ${r}-letter arrangements can be made from ${n} distinct letters (no repetition)?`,
      hint: `Different orderings of the same letters count separately, so use $${latexP(n, r)}$.`,
      solution: [
        `Each arrangement is a different sequence (order matters), so use permutations.`,
        `$${latexP(n, r)} = \\dfrac{${n}!}{(${n} - ${r})!} = ${permutation(n, r)}$`,
      ].join("\n"),
    }),
  },
  {
    type: "permutation",
    template: (n, r) => ({
      text: `A museum has ${n} paintings to display. They have wall space for ${r} paintings in a row. How many different arrangements are possible?`,
      hint: `The arrangement (order) of paintings matters, so use $${latexP(n, r)}$.`,
      solution: [
        `The order of paintings on the wall matters, so use permutations.`,
        `$${latexP(n, r)} = \\dfrac{${n}!}{(${n} - ${r})!} = ${permutation(n, r)}$`,
      ].join("\n"),
    }),
  },
  {
    type: "permutation",
    template: (n, r) => ({
      text: `A password is created by choosing ${r} different digits from the digits 0 to ${n - 1} (no repetition). How many different passwords are possible?`,
      hint: `Different orderings of the same digits give different passwords, so use $${latexP(n, r)}$.`,
      solution: [
        `Different orderings give different passwords (order matters), so use permutations.`,
        `$${latexP(n, r)} = \\dfrac{${n}!}{(${n} - ${r})!} = ${permutation(n, r)}$`,
      ].join("\n"),
    }),
  },
];

export function generateCPQuestion(
  difficulty: Difficulty = "medium",
  overrides?: DifficultyParams
): Question {
  const base = CP_DEFAULTS[difficulty];
  const p = { ...base, ...overrides };
  const n = randInt(p.nMin, p.nMax);
  const r = randInt(p.rMin, Math.min(p.rMax, n - 1));
  const scenario = pick(CP_SCENARIOS);
  const { text, hint, solution } = scenario.template(n, r);
  const answer = scenario.type === "combination" ? combination(n, r) : permutation(n, r);
  return { id: uid(), text, answer, solution, hint };
}

// ─── Generator: quadratic-equation ───────────────────────────────────────────

export function generateQuadraticQuestion(
  difficulty: Difficulty = "medium",
  overrides?: DifficultyParams
): QuadraticQuestion {
  const base = QUAD_DEFAULTS[difficulty];
  const p = { ...base, ...overrides };
  const form = pick(QUAD_FORMS[difficulty]);

  // ── factored-monic: x² + bx + c = 0 ──────────────────────────────────────
  if (form === "factored-monic") {
    const r1 = randInt(p.rootMin, p.rootMax);
    let r2 = randInt(p.rootMin, p.rootMax);
    while (r2 === r1) r2 = randInt(p.rootMin, p.rootMax);
    const b = -(r1 + r2);
    const c = r1 * r2;
    const bStr = b === 0 ? "" : b > 0 ? ` + ${b}x` : ` - ${Math.abs(b)}x`;
    const cStr = c === 0 ? "" : c > 0 ? ` + ${c}` : ` - ${Math.abs(c)}`;
    const [lo, hi] = r1 <= r2 ? [r1, r2] : [r2, r1];
    return {
      id: uid(),
      text: "Find both roots. Enter the smaller root first, then the larger root.",
      equation: `x^2${bStr}${cStr} = 0`,
      answer: lo,
      answer2: hi,
      solution: [
        `$x^2${bStr}${cStr} = 0$`,
        `Factor: $${rootFactor(r1)}${rootFactor(r2)} = 0$`,
        `$x = ${showNum(r1)}$ or $x = ${showNum(r2)}$`,
        `Roots: $x = ${lo}$ and $x = ${hi}$`,
      ].join("\n"),
      hint: `Look for two integers that multiply to $${c}$ and add to $${b}$.`,
    };
  }

  // ── factored-scaled: ax² + bx + c = 0 ────────────────────────────────────
  if (form === "factored-scaled") {
    const a = randInt(p.aMin, p.aMax);
    const r1 = randInt(p.rootMin, p.rootMax);
    let r2 = randInt(p.rootMin, p.rootMax);
    while (r2 === r1) r2 = randInt(p.rootMin, p.rootMax);
    const b = -a * (r1 + r2);
    const c = a * r1 * r2;
    const bStr = b === 0 ? "" : b > 0 ? ` + ${b}x` : ` - ${Math.abs(b)}x`;
    const cStr = c === 0 ? "" : c > 0 ? ` + ${c}` : ` - ${Math.abs(c)}`;
    const [lo, hi] = r1 <= r2 ? [r1, r2] : [r2, r1];
    return {
      id: uid(),
      text: "Find both roots. Enter the smaller root first, then the larger root.",
      equation: `${a}x^2${bStr}${cStr} = 0`,
      answer: lo,
      answer2: hi,
      solution: [
        `$${a}x^2${bStr}${cStr} = 0$`,
        `Factor: $${a}${rootFactor(r1)}${rootFactor(r2)} = 0$`,
        `$x = ${showNum(r1)}$ or $x = ${showNum(r2)}$`,
        `Roots: $x = ${lo}$ and $x = ${hi}$`,
      ].join("\n"),
      hint: `Divide both sides by $${a}$ first, then factor the monic quadratic.`,
    };
  }

  // ── perfect-square: (x + a)² = b² ────────────────────────────────────────
  if (form === "perfect-square") {
    const a = randInt(Math.max(p.rootMin, -6), Math.min(p.rootMax, 6));
    const bVal = randInt(1, Math.min(7, p.rootMax));
    const r1 = -a + bVal;
    const r2 = -a - bVal;
    const expanded_b = -2 * a;
    const expanded_c = a * a - bVal * bVal;
    const bStr = expanded_b === 0 ? "" : expanded_b > 0 ? ` + ${expanded_b}x` : ` - ${Math.abs(expanded_b)}x`;
    const cStr = expanded_c === 0 ? "" : expanded_c > 0 ? ` + ${expanded_c}` : ` - ${Math.abs(expanded_c)}`;
    const [lo, hi] = r1 <= r2 ? [r1, r2] : [r2, r1];
    const sqFactor = a === 0 ? "x" : a > 0 ? `(x + ${a})` : `(x - ${Math.abs(a)})`;
    return {
      id: uid(),
      text: "Find both roots. Enter the smaller root first, then the larger root.",
      equation: `x^2${bStr}${cStr} = 0`,
      answer: lo,
      answer2: hi,
      solution: [
        `$x^2${bStr}${cStr} = 0$`,
        `Recognise perfect square: $${sqFactor}^2 = ${bVal * bVal}$`,
        `$x = ${-a} + ${bVal} = ${r1}$`,
        `$x = ${-a} - ${bVal} = ${r2}$`,
        `Roots: $x = ${lo}$ and $x = ${hi}$`,
      ].join("\n"),
      hint: `Try completing the square or recognising the perfect-square pattern.`,
    };
  }

  // ── difference-squares: x² - k² = 0 ─────────────────────────────────────
  const k = randInt(1, Math.min(8, p.rootMax));
  return {
    id: uid(),
    text: "Find both roots. Enter the smaller root first, then the larger root.",
    equation: `x^2 - ${k * k} = 0`,
    answer: -k,
    answer2: k,
    solution: [
      `$x^2 - ${k * k} = 0$`,
      `Difference of squares: $(x - ${k})(x + ${k}) = 0$`,
      `$x = ${k}$ or $x = ${-k}$`,
      `Roots: $x = ${-k}$ and $x = ${k}$`,
    ].join("\n"),
    hint: `Recognise the difference of squares: $x^2 - ${k * k} = (x - ${k})(x + ${k})$.`,
  };
}

// ─── Generator: exponents ─────────────────────────────────────────────────────

const EXP_DEFAULTS: Record<Difficulty, { baseMin: number; baseMax: number; expMin: number; expMax: number }> = {
  easy:   { baseMin: 2, baseMax: 4,  expMin: 1, expMax: 4  },
  medium: { baseMin: 2, baseMax: 6,  expMin: 2, expMax: 6  },
  hard:   { baseMin: 2, baseMax: 10, expMin: 2, expMax: 8  },
};

type ExpForm =
  | "product-rule"       // x^a * x^b = x^(a+b)  → answer is a+b
  | "quotient-rule"      // x^a / x^b = x^(a-b)  → answer is a-b
  | "power-rule"         // (x^a)^b = x^(a*b)    → answer is a*b
  | "zero-exponent"      // x^0 = 1
  | "negative-exponent"  // x^(-a) = 1/x^a       → answer is the denominator value
  | "evaluate"           // compute b^n exactly
  | "product-evaluate"   // b^a * b^c = b^(a+c) → evaluate the result
  | "power-of-power-evaluate"; // (b^a)^c → evaluate

const EXP_FORMS: Record<Difficulty, ExpForm[]> = {
  easy:   ["product-rule", "quotient-rule", "evaluate", "zero-exponent"],
  medium: ["product-rule", "quotient-rule", "power-rule", "evaluate", "product-evaluate"],
  hard:   ["power-rule", "negative-exponent", "product-evaluate", "power-of-power-evaluate"],
};

export function generateExponentQuestion(
  difficulty: Difficulty = "medium",
  _overrides?: DifficultyParams
): Question {
  // Draw from the static AMC 10 Exponents problem pool.
  // "easy" difficulty maps to "medium" problems (the pool has no trivially easy problems).
  const poolDifficulty = difficulty === "easy" ? "medium" : difficulty;
  const prob = getRandomExponentProblem(poolDifficulty);
  return {
    id: uid(),
    text: prob.text,
    equation: prob.equation,
    answer: prob.answer,
    solution: [
      `**Section:** ${prob.sectionTitle}`,
      prob.solution,
      `**Answer:** $${prob.answer}$`,
    ].join("\n"),
    hint: prob.hint,
  };
}
