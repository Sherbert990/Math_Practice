/**
 * Settings.tsx — In-app configuration page
 *
 * DESIGN: "Scientific Notebook" — same design system as Home.tsx
 *
 * Sections:
 *   1. Categories — per-category: label, sublabel, default difficulty, daily goal
 *   2. Difficulty Params — per-category, per-tier: coefficient/n/r/root ranges
 *   3. Example Questions — per-category, per-tier: sample question + answer (calibration anchors)
 *   4. Reset — restore all settings to defaults
 *
 * All changes are saved to localStorage immediately on "Save" click.
 * The practice page reads from the same store on every question generation.
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calculator,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Save,
  Info,
} from "lucide-react";
import { CATEGORY_REGISTRY, type CategoryDef, type Difficulty } from "@/lib/categories";
import {
  loadGoalConfig,
  saveGoalConfig,
  goalForCategory,
  loadCategoryConfig,
  saveCategoryConfig,
  resetAllCategoryOverrides,
  type CategoryOverride,
  type DifficultyParams,
  type ExampleQuestion,
  type CategoryConfigStore,
} from "@/lib/storage";

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const DIFFICULTY_BADGE: Record<Difficulty, string> = {
  easy: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  medium: "bg-amber-100 text-amber-700 border border-amber-200",
  hard: "bg-rose-100 text-rose-700 border border-rose-200",
};

// Which param fields apply to each category type
const LINEAR_PARAM_FIELDS: Array<{ key: keyof DifficultyParams; label: string; hint: string }> = [
  { key: "coeffMin", label: "Coefficient min", hint: "Minimum value for x coefficients" },
  { key: "coeffMax", label: "Coefficient max", hint: "Maximum value for x coefficients" },
  { key: "constMin", label: "Constant min", hint: "Minimum value for constant terms" },
  { key: "constMax", label: "Constant max", hint: "Maximum value for constant terms" },
  { key: "xMin", label: "Answer (x) min", hint: "Minimum value of the solution x" },
  { key: "xMax", label: "Answer (x) max", hint: "Maximum value of the solution x" },
];

const CP_PARAM_FIELDS: Array<{ key: keyof DifficultyParams; label: string; hint: string }> = [
  { key: "nMin", label: "n min", hint: "Minimum total number of items" },
  { key: "nMax", label: "n max", hint: "Maximum total number of items" },
  { key: "rMin", label: "r min", hint: "Minimum number to choose/arrange" },
  { key: "rMax", label: "r max", hint: "Maximum number to choose/arrange" },
];

const QUAD_PARAM_FIELDS: Array<{ key: keyof DifficultyParams; label: string; hint: string }> = [
  { key: "aMin", label: "Leading coeff (a) min", hint: "Minimum value of the leading coefficient a" },
  { key: "aMax", label: "Leading coeff (a) max", hint: "Maximum value of the leading coefficient a" },
  { key: "rootMin", label: "Root min", hint: "Minimum value of integer roots" },
  { key: "rootMax", label: "Root max", hint: "Maximum value of integer roots" },
];

function paramFieldsForCategory(catId: string) {
  if (catId === "linear-equation") return LINEAR_PARAM_FIELDS;
  if (catId === "combo-permu") return CP_PARAM_FIELDS;
  if (catId === "quadratic-equation") return QUAD_PARAM_FIELDS;
  return [];
}

// ─── Default difficulty params (mirrors mathGenerator.ts) ─────────────────────

const DEFAULT_PARAMS: Record<string, Record<Difficulty, DifficultyParams>> = {
  "linear-equation": {
    easy:   { coeffMin: 1,   coeffMax: 5,   constMin: 1,   constMax: 10,  xMin: 1,   xMax: 10  },
    medium: { coeffMin: -6,  coeffMax: 6,   constMin: -10, constMax: 10,  xMin: -10, xMax: 10  },
    hard:   { coeffMin: -12, coeffMax: 12,  constMin: -20, constMax: 20,  xMin: -15, xMax: 15  },
  },
  "combo-permu": {
    easy:   { nMin: 4,  nMax: 7,  rMin: 2, rMax: 2 },
    medium: { nMin: 5,  nMax: 12, rMin: 2, rMax: 4 },
    hard:   { nMin: 10, nMax: 20, rMin: 3, rMax: 6 },
  },
  "quadratic-equation": {
    easy:   { aMin: 1, aMax: 1, rootMin: -4,  rootMax: 4  },
    medium: { aMin: 1, aMax: 4, rootMin: -8,  rootMax: 8  },
    hard:   { aMin: 2, aMax: 6, rootMin: -12, rootMax: 12 },
  },
};

const DEFAULT_EXAMPLES: Record<string, Record<Difficulty, ExampleQuestion>> = {
  "linear-equation": {
    easy:   { question: "3x = 12", answer: "x = 4" },
    medium: { question: "2(x − 3) = 4x + 6", answer: "x = −6" },
    hard:   { question: "5(2x − 7) = 3x + 14", answer: "x = 7" },
  },
  "combo-permu": {
    easy:   { question: "Select 2 students from 5 to form a pair. How many pairs?", answer: "C(5,2) = 10" },
    medium: { question: "Fill 3 distinct officer roles from 8 club members. How many ways?", answer: "P(8,3) = 336" },
    hard:   { question: "Arrange 5 paintings in a row from 15. How many arrangements?", answer: "P(15,5) = 360360" },
  },
  "quadratic-equation": {
    easy:   { question: "x² − 3x + 2 = 0", answer: "x = 1 and x = 2" },
    medium: { question: "2x² − 2x − 12 = 0", answer: "x = −2 and x = 3" },
    hard:   { question: "3x² − 3x − 36 = 0", answer: "x = −3 and x = 4" },
  },
};

// ─── Small UI helpers ─────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="site-title text-xl text-foreground">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-1 min-w-0 pt-1">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => {
        const v = parseInt(e.target.value);
        if (!isNaN(v)) onChange(v);
      }}
      className="w-20 px-3 py-1.5 rounded-lg border-2 border-input font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background text-foreground text-center"
    />
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  wide,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${wide ? "w-full" : "w-48"} px-3 py-1.5 rounded-lg border-2 border-input text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background text-foreground`}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 rounded-lg border-2 border-input text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background text-foreground"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function Collapsible({
  title,
  badge,
  badgeStyle,
  defaultOpen,
  children,
}: {
  title: string;
  badge?: string;
  badgeStyle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badge && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeStyle}`}>
              {badge}
            </span>
          )}
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="px-4 py-4 space-y-4">{children}</div>}
    </div>
  );
}

// ─── Category card ────────────────────────────────────────────────────────────

function CategoryCard({
  cat,
  override,
  goalValue,
  onOverrideChange,
  onGoalChange,
}: {
  cat: CategoryDef;
  override: CategoryOverride;
  goalValue: number;
  onOverrideChange: (o: CategoryOverride) => void;
  onGoalChange: (v: number) => void;
}) {
  const Icon = cat.icon;
  const paramFields = paramFieldsForCategory(cat.id);
  const defaults = DEFAULT_PARAMS[cat.id] ?? {};
  const defaultExamples = DEFAULT_EXAMPLES[cat.id] ?? {};

  const getParam = (diff: Difficulty, key: keyof DifficultyParams): number => {
    return (
      (override.difficultyParams?.[diff]?.[key] as number | undefined) ??
      (defaults[diff]?.[key] as number | undefined) ??
      0
    );
  };

  const setParam = (diff: Difficulty, key: keyof DifficultyParams, value: number) => {
    const current = override.difficultyParams ?? {};
    const tier = { ...(current[diff] ?? {}) };
    (tier as Record<string, number>)[key] = value;
    onOverrideChange({
      ...override,
      difficultyParams: { ...current, [diff]: tier },
    });
  };

  const getExample = (diff: Difficulty): ExampleQuestion => {
    return (
      override.exampleQuestions?.[diff] ?? defaultExamples[diff] ?? { question: "", answer: "" }
    );
  };

  const setExample = (diff: Difficulty, field: keyof ExampleQuestion, value: string) => {
    const current = override.exampleQuestions ?? {};
    const ex = { ...(current[diff] ?? defaultExamples[diff] ?? { question: "", answer: "" }) };
    ex[field] = value;
    onOverrideChange({
      ...override,
      exampleQuestions: { ...current, [diff]: ex },
    });
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <div className="font-semibold text-foreground">{cat.label}</div>
          <div className="text-xs text-muted-foreground">{cat.id}</div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* ── Basic info ── */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Display
          </h3>
          <FieldRow label="Label" hint="Name shown in the sidebar">
            <TextInput
              value={override.label ?? cat.label}
              onChange={(v) => onOverrideChange({ ...override, label: v })}
              placeholder={cat.label}
            />
          </FieldRow>
          <FieldRow label="Sublabel" hint="Short description under the label">
            <TextInput
              value={override.sublabel ?? cat.sublabel}
              onChange={(v) => onOverrideChange({ ...override, sublabel: v })}
              placeholder={cat.sublabel}
            />
          </FieldRow>
          <FieldRow label="Default difficulty" hint="Difficulty level when this category is selected">
            <SelectInput
              value={override.defaultDifficulty ?? cat.defaultDifficulty}
              onChange={(v) =>
                onOverrideChange({ ...override, defaultDifficulty: v as Difficulty })
              }
              options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }))}
            />
          </FieldRow>
          <FieldRow label="Daily goal" hint="Problems to complete per day for this category">
            <div className="flex items-center gap-2">
              <NumberInput value={goalValue} onChange={onGoalChange} min={1} max={200} />
              <span className="text-xs text-muted-foreground">/day</span>
            </div>
          </FieldRow>
        </div>

        {/* ── Difficulty params ── */}
        {paramFields.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Difficulty Parameters
            </h3>
            <div className="space-y-2">
              {DIFFICULTIES.map((diff) => (
                <Collapsible
                  key={diff}
                  title={DIFFICULTY_LABELS[diff]}
                  badge={diff}
                  badgeStyle={DIFFICULTY_BADGE[diff]}
                >
                  <div className="space-y-3">
                    {paramFields.map((f) => (
                      <FieldRow key={f.key} label={f.label} hint={f.hint}>
                        <NumberInput
                          value={getParam(diff, f.key)}
                          onChange={(v) => setParam(diff, f.key, v)}
                        />
                      </FieldRow>
                    ))}
                  </div>
                </Collapsible>
              ))}
            </div>
          </div>
        )}

        {/* ── Example questions ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Example Questions
            </h3>
            <div className="group relative">
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              <div className="absolute left-5 top-0 z-10 hidden group-hover:block w-64 text-xs bg-popover border border-border rounded-lg p-3 shadow-lg text-popover-foreground leading-relaxed">
                These are calibration anchors that define what "medium" looks like for this
                category. They are shown as reference examples in the UI and guide difficulty
                scaling. They do not affect question generation directly.
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {DIFFICULTIES.map((diff) => {
              const ex = getExample(diff);
              return (
                <Collapsible
                  key={diff}
                  title={`${DIFFICULTY_LABELS[diff]} example`}
                  badge={diff}
                  badgeStyle={DIFFICULTY_BADGE[diff]}
                >
                  <div className="space-y-3">
                    <FieldRow label="Question" hint="The example question text or equation">
                      <TextInput
                        value={ex.question}
                        onChange={(v) => setExample(diff, "question", v)}
                        placeholder="e.g. 2(x − 3) = 4x + 6"
                        wide
                      />
                    </FieldRow>
                    <FieldRow label="Answer" hint="The expected answer for this example">
                      <TextInput
                        value={ex.answer}
                        onChange={(v) => setExample(diff, "answer", v)}
                        placeholder="e.g. x = −6"
                      />
                    </FieldRow>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsPage() {
  // Load initial state from localStorage
  const [goalConfig, setGoalConfigState] = useState(() => loadGoalConfig());
  const [catConfig, setCatConfigState] = useState<CategoryConfigStore>(() =>
    loadCategoryConfig()
  );
  const [saved, setSaved] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  // Build a working override for each category (fill in defaults if missing)
  const getOverride = (cat: CategoryDef): CategoryOverride => {
    return catConfig[cat.id] ?? { id: cat.id };
  };

  const handleOverrideChange = (override: CategoryOverride) => {
    setCatConfigState((prev) => ({ ...prev, [override.id]: override }));
    setSaved(false);
  };

  const handleGoalChange = (catId: string, value: number) => {
    setGoalConfigState((prev) => ({
      ...prev,
      categoryGoals: { ...prev.categoryGoals, [catId]: value },
    }));
    setSaved(false);
  };

  const handleSave = () => {
    saveGoalConfig(goalConfig);
    saveCategoryConfig(catConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 3000);
      return;
    }
    resetAllCategoryOverrides();
    setCatConfigState({});
    const fresh = {
      categoryGoals: Object.fromEntries([
        ["__default__", 10],
        ...CATEGORY_REGISTRY.map((c) => [c.id, 10]),
      ]),
    };
    saveGoalConfig(fresh);
    setGoalConfigState(fresh);
    setResetConfirm(false);
    setSaved(false);
  };

  // Persist on every change (auto-save) — also save on explicit button click
  useEffect(() => {
    // Debounced auto-save
    const t = setTimeout(() => {
      saveGoalConfig(goalConfig);
      saveCategoryConfig(catConfig);
    }, 800);
    return () => clearTimeout(t);
  }, [goalConfig, catConfig]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Calculator className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="site-title text-xl text-foreground tracking-tight">Math Practice</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-accent">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Practice</span>
              </button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container py-8 max-w-3xl mx-auto">
        {/* Page title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="site-title text-3xl text-foreground mb-1">Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure categories, difficulty parameters, example questions, and daily goals.
              Changes are saved automatically.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={handleSave}
              className="flex items-center gap-1.5"
              variant={saved ? "outline" : "default"}
            >
              <Save className="w-4 h-4" />
              {saved ? "Saved!" : "Save"}
            </Button>
          </div>
        </div>

        {/* Auto-save indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6 bg-muted/50 rounded-lg px-4 py-2.5 border border-border">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            Changes are auto-saved to your browser's local storage. They persist across sessions
            on this device. Clearing browser data will reset all settings.
          </span>
        </div>

        {/* ── Category cards ── */}
        <SectionHeader
          title="Categories"
          subtitle="Customize each category's display name, default difficulty, daily goal, generation parameters, and example questions."
        />

        <div className="space-y-6 mb-10">
          {CATEGORY_REGISTRY.map((cat) => (
            <CategoryCard
              key={cat.id}
              cat={cat}
              override={getOverride(cat)}
              goalValue={goalForCategory(goalConfig, cat.id)}
              onOverrideChange={handleOverrideChange}
              onGoalChange={(v) => handleGoalChange(cat.id, v)}
            />
          ))}
        </div>

        {/* ── Reset ── */}
        <div className="border border-destructive/30 rounded-xl p-5 bg-destructive/5">
          <h3 className="font-semibold text-foreground mb-1">Reset All Settings</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Restore all categories, difficulty parameters, example questions, and daily goals to
            their original defaults. This cannot be undone.
          </p>
          <Button
            variant="outline"
            onClick={handleReset}
            className={`flex items-center gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 bg-background ${
              resetConfirm ? "ring-2 ring-destructive/50" : ""
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            {resetConfirm ? "Click again to confirm reset" : "Reset to defaults"}
          </Button>
        </div>
      </div>
    </div>
  );
}
