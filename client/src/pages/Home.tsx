/**
 * Home.tsx — Practice page
 *
 * DESIGN: "Scientific Notebook" — Swiss Typographic Style meets Modern SaaS
 * Layout: Asymmetric — left sidebar (category + daily progress + score), right main area
 * Fonts: DM Serif Display (title), Source Serif 4 (questions), JetBrains Mono (equations), DM Sans (UI)
 *
 * DATA: All answer events are persisted via storage.ts (localStorage).
 *       Daily goals and category overrides are read from localStorage via getEffectiveRegistry().
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { BlockMath, MathLines, MathText } from "@/components/Math";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Lightbulb,
  RefreshCw,
  ChevronRight,
  BookOpen,
  Calculator,
  Trophy,
  RotateCcw,
  Settings,
  BarChart2,
  FolderOpen,
} from "lucide-react";
import { Link } from "wouter";
import {
  getEffectiveRegistry,
  DEFAULT_CATEGORY_ID,
  CATEGORY_GROUPS,
  type CategoryDef,
  type CategoryGroup,
  type Difficulty,
} from "@/lib/categories";
import type { Question, QuadraticQuestion } from "@/lib/mathGenerator";
import {
  recordAnswer,
  getTodayRecord,
  loadGoalConfig,
  goalForCategory,
  type DailyRecord,
} from "@/lib/storage";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnswerState = "idle" | "correct" | "incorrect";

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
  medium: "text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100",
  hard: "text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100",
};

const DIFFICULTY_ACTIVE_COLORS: Record<Difficulty, string> = {
  easy: "text-emerald-700 bg-emerald-100 border-emerald-400 ring-2 ring-emerald-300 font-semibold",
  medium: "text-amber-700 bg-amber-100 border-amber-400 ring-2 ring-amber-300 font-semibold",
  hard: "text-rose-700 bg-rose-100 border-rose-400 ring-2 ring-rose-300 font-semibold",
};

interface SessionStats {
  total: number;
  correct: number;
  streak: number;
  bestStreak: number;
}

// ─── Daily progress mini-bar ──────────────────────────────────────────────────

function DailyProgressBar({
  cat,
  record,
  goal,
}: {
  cat: CategoryDef;
  record: DailyRecord;
  goal: number;
}) {
  const stat = record.categories[cat.id] ?? { attempted: 0, correct: 0 };
  const pct = Math.min(100, Math.round((stat.attempted / goal) * 100));
  const done = stat.attempted >= goal;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium truncate ${done ? "text-emerald-600" : "text-muted-foreground"}`}>
          {cat.label}
        </span>
        <span className={`font-mono ml-2 flex-shrink-0 ${done ? "text-emerald-600" : "text-muted-foreground"}`}>
          {stat.attempted}/{goal}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full progress-fill ${done ? "bg-emerald-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategoryButton({
  cat,
  active,
  onClick,
}: {
  cat: CategoryDef;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = cat.icon;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
        active
          ? "bg-primary text-primary-foreground shadow-md"
          : "hover:bg-accent text-foreground"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`flex-shrink-0 ${active ? "text-primary-foreground" : "text-primary"}`}>
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <div className={`text-sm font-semibold leading-tight ${active ? "text-primary-foreground" : ""}`}>
            {cat.label}
          </div>
          <div className={`text-xs mt-0.5 leading-tight ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            {cat.sublabel}
          </div>
        </div>
      </div>
    </button>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg px-4 py-3 ${highlight ? "bg-primary/10 border border-primary/20" : "bg-muted"}`}>
      <div className="score-badge text-xl text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  // Read effective registry (with user overrides applied) on mount
  const [registry, setRegistry] = useState(() => getEffectiveRegistry());
  const defaultCat = registry.find((c) => c.id === DEFAULT_CATEGORY_ID) ?? registry[0];

  const [activeCat, setActiveCat] = useState<CategoryDef>(defaultCat);
  const [difficulty, setDifficulty] = useState<Difficulty>(defaultCat.defaultDifficulty);
  const [question, setQuestion] = useState<Question>(() =>
    defaultCat.generate(defaultCat.defaultDifficulty)
  );
  const [userAnswer, setUserAnswer] = useState("");
  const [userAnswer2, setUserAnswer2] = useState("");
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [showSolution, setShowSolution] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [stats, setStats] = useState<SessionStats>({
    total: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
  });
  const [questionKey, setQuestionKey] = useState(0);
  const [goalConfig, setGoalConfig] = useState(() => loadGoalConfig());
  const [todayRecord, setTodayRecord] = useState<DailyRecord>(() => getTodayRecord());
  const inputRef = useRef<HTMLInputElement>(null);

  // Refresh registry and goals when returning from Settings page
  useEffect(() => {
    const handleFocus = () => {
      const fresh = getEffectiveRegistry();
      setRegistry(fresh);
      setGoalConfig(loadGoalConfig());
      // Update active cat label/sublabel/defaultDifficulty if overridden
      setActiveCat((prev) => fresh.find((c) => c.id === prev.id) ?? prev);
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [questionKey]);

  const loadNewQuestion = useCallback(
    (cat?: CategoryDef, diff?: Difficulty) => {
      const c = cat ?? activeCat;
      const d = diff ?? difficulty;
      setQuestion(c.generate(d));
      setUserAnswer("");
      setUserAnswer2("");
      setAnswerState("idle");
      setShowSolution(false);
      setShowHint(false);
      setQuestionKey((k) => k + 1);
    },
    [activeCat, difficulty]
  );

  const handleCategoryChange = (cat: CategoryDef) => {
    setActiveCat(cat);
    const newDiff = cat.defaultDifficulty;
    setDifficulty(newDiff);
    loadNewQuestion(cat, newDiff);
  };

  const handleDifficultyChange = (d: Difficulty) => {
    setDifficulty(d);
    loadNewQuestion(activeCat, d);
  };

  // Detect quadratic by the presence of answer2 on the question object (more robust than ID check)
  const quadQ = "answer2" in question ? (question as QuadraticQuestion) : null;
  const isQuadratic = quadQ !== null;

  const handleSubmit = () => {
    const trimmed = userAnswer.trim();
    if (!trimmed) return;
    const parsed = parseFloat(trimmed);
    if (isNaN(parsed)) return;

    let isCorrect: boolean;
    if (isQuadratic && quadQ) {
      // For quadratic: accept both roots in either order.
      // If second box is empty, treat it as a single-root entry attempt and mark wrong.
      const trimmed2 = userAnswer2.trim();
      if (!trimmed2) {
        // User only filled one box — mark incorrect and show solution
        setAnswerState("incorrect");
        recordAnswer(activeCat.id, false);
        setTodayRecord(getTodayRecord());
        setStats((prev) => ({
          total: prev.total + 1,
          correct: prev.correct,
          streak: 0,
          bestStreak: prev.bestStreak,
        }));
        setShowSolution(true);
        return;
      }
      const parsed2 = parseFloat(trimmed2);
      if (isNaN(parsed2)) {
        setAnswerState("incorrect");
        recordAnswer(activeCat.id, false);
        setTodayRecord(getTodayRecord());
        setStats((prev) => ({
          total: prev.total + 1,
          correct: prev.correct,
          streak: 0,
          bestStreak: prev.bestStreak,
        }));
        setShowSolution(true);
        return;
      }
      // Use tolerance of 0.5 since all quadratic roots in this app are integers
      const EPS = 0.5;
      isCorrect =
        (Math.abs(parsed - quadQ.answer) < EPS && Math.abs(parsed2 - quadQ.answer2) < EPS) ||
        (Math.abs(parsed - quadQ.answer2) < EPS && Math.abs(parsed2 - quadQ.answer) < EPS);
    } else {
      isCorrect = Math.abs(parsed - question.answer) < 0.5;
    }

    setAnswerState(isCorrect ? "correct" : "incorrect");
    recordAnswer(activeCat.id, isCorrect);
    setTodayRecord(getTodayRecord());

    setStats((prev) => {
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      return {
        total: prev.total + 1,
        correct: prev.correct + (isCorrect ? 1 : 0),
        streak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
      };
    });

    if (!isCorrect) setShowSolution(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && answerState === "idle") handleSubmit();
    if (e.key === "Enter" && answerState !== "idle") loadNewQuestion();
  };

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  const handleResetStats = () => {
    setStats({ total: 0, correct: 0, streak: 0, bestStreak: 0 });
    loadNewQuestion();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Header ── */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Calculator className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="site-title text-xl text-foreground tracking-tight">Math Practice</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/categories">
              <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-accent">
                <FolderOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Categories</span>
              </button>
            </Link>
            <Link href="/progress">
              <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-accent">
                <BarChart2 className="w-4 h-4" />
                <span className="hidden sm:inline">Progress</span>
              </button>
            </Link>
            <Link href="/settings">
              <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-accent">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded">
                Enter
              </kbd>
              <span>to submit</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Left Sidebar ── */}
          <aside className="lg:w-64 flex-shrink-0 space-y-5">
            {/* Hero image */}
            <div className="rounded-xl overflow-hidden border border-border shadow-sm">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663338751151/hwmZMQzRfgq5KdZ7wScgW8/math-hero-HwQrNj9cf5F3YTXCr8Adx9.webp"
                alt="Math notebook"
                className="w-full h-36 object-cover object-top"
              />
            </div>

            {/* Category selector — grouped into Foundation and AMC 8 */}
            <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
              {CATEGORY_GROUPS.map((group: CategoryGroup, gi: number) => {
                // For Foundation group, use the live registry (with user overrides)
                const cats =
                  group.id === "foundation"
                    ? registry
                    : group.categories;
                if (cats.length === 0) return null;
                return (
                  <div key={group.id} className={gi > 0 ? "mt-4" : ""}>
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      {group.label}
                    </h2>
                    <div className="space-y-1.5">
                      {cats.map((cat) => (
                        <CategoryButton
                          key={cat.id}
                          cat={cat}
                          active={activeCat.id === cat.id}
                          onClick={() => handleCategoryChange(cat)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Today's goal progress */}
            <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Today's Goal
                </h2>
                <Link href="/settings">
                  <button
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Edit goals in Settings"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
              <div className="space-y-3">
                {registry.map((cat) => (
                  <DailyProgressBar
                    key={cat.id}
                    cat={cat}
                    record={todayRecord}
                    goal={goalForCategory(goalConfig, cat.id)}
                  />
                ))}
              </div>
            </div>

            {/* Session stats */}
            <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Session Stats
                </h2>
                <button
                  onClick={handleResetStats}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Reset session"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Answered" value={stats.total} />
                <StatCard label="Correct" value={stats.correct} highlight />
                <StatCard label="Streak" value={`${stats.streak} 🔥`} highlight={stats.streak >= 3} />
                <StatCard label="Accuracy" value={`${accuracy}%`} />
              </div>
              {stats.total > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Accuracy</span>
                    <span>{accuracy}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full progress-fill"
                      style={{ width: `${accuracy}%` }}
                    />
                  </div>
                </div>
              )}
              {stats.bestStreak >= 3 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <Trophy className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Best streak: {stats.bestStreak}</span>
                </div>
              )}
            </div>
          </aside>

          {/* ── Main Question Area ── */}
          <main className="flex-1 min-w-0">
            <div
              key={questionKey}
              className="animate-slide-in-up bg-card rounded-xl border border-border shadow-sm overflow-hidden"
            >
              {/* Card header */}
              <div className="px-6 py-4 border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {activeCat.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Difficulty toggle */}
                  <div className="flex items-center gap-1">
                    {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => handleDifficultyChange(d)}
                        className={`px-2.5 py-1 rounded-md text-xs border transition-all duration-150 ${
                          difficulty === d
                            ? DIFFICULTY_ACTIVE_COLORS[d]
                            : DIFFICULTY_COLORS[d]
                        }`}
                      >
                        {DIFFICULTY_LABELS[d]}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => loadNewQuestion()}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    New question
                  </button>
                </div>
              </div>

              {/* Question body */}
              <div className="px-6 py-6">
                <p className="question-text text-lg text-foreground leading-relaxed mb-5">
                  <MathText text={question.text} />
                </p>

                {question.equation && (
                  <div className="mb-6 select-all">
                    <BlockMath latex={question.equation} />
                  </div>
                )}

                {/* Answer input */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">
                    {isQuadratic ? "Both roots (any order):" : "Your answer:"}
                  </label>
                  <div className="flex gap-3 flex-wrap">
                    {isQuadratic ? (
                      <>
                        <input
                          ref={inputRef}
                          type="number"
                          value={userAnswer}
                          onChange={(e) => {
                            if (answerState === "idle") setUserAnswer(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (userAnswer2.trim()) handleSubmit();
                              else document.getElementById("root2-input")?.focus();
                            }
                          }}
                          disabled={answerState !== "idle"}
                          placeholder="Root 1…"
                          className={`w-32 px-4 py-3 rounded-lg border-2 font-mono text-base transition-all duration-200 outline-none ${
                            answerState === "correct"
                              ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                              : answerState === "incorrect"
                              ? "border-rose-400 bg-rose-50 text-rose-800"
                              : "border-input focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background text-foreground"
                          }`}
                        />
                        <input
                          id="root2-input"
                          type="number"
                          value={userAnswer2}
                          onChange={(e) => {
                            if (answerState === "idle") setUserAnswer2(e.target.value);
                          }}
                          onKeyDown={handleKeyDown}
                          disabled={answerState !== "idle"}
                          placeholder="Root 2…"
                          className={`w-32 px-4 py-3 rounded-lg border-2 font-mono text-base transition-all duration-200 outline-none ${
                            answerState === "correct"
                              ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                              : answerState === "incorrect"
                              ? "border-rose-400 bg-rose-50 text-rose-800"
                              : "border-input focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background text-foreground"
                          }`}
                        />
                      </>
                    ) : (
                      <input
                        ref={inputRef}
                        type="number"
                        value={userAnswer}
                        onChange={(e) => {
                          if (answerState === "idle") setUserAnswer(e.target.value);
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={answerState !== "idle"}
                        placeholder="Enter a number…"
                        className={`flex-1 min-w-48 px-4 py-3 rounded-lg border-2 font-mono text-base transition-all duration-200 outline-none ${
                          answerState === "correct"
                            ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                            : answerState === "incorrect"
                            ? "border-rose-400 bg-rose-50 text-rose-800"
                            : "border-input focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background text-foreground"
                        }`}
                      />
                    )}
                    {answerState === "idle" && (
                      <Button onClick={handleSubmit} className="flex items-center gap-1.5 px-6">
                        Check
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
                    {answerState !== "idle" && (
                      <Button
                        onClick={() => loadNewQuestion()}
                        variant="outline"
                        className="flex items-center gap-1.5 px-6 bg-background"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Next
                      </Button>
                    )}
                  </div>
                </div>

                {/* Hint */}
                {answerState === "idle" && (
                  <button
                    onClick={() => setShowHint((v) => !v)}
                    className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Lightbulb className="w-4 h-4" />
                    {showHint ? "Hide hint" : "Show hint"}
                  </button>
                )}
                {showHint && answerState === "idle" && (
                  <div className="mt-3 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800"><MathText text={question.hint} /></p>
                  </div>
                )}

                {/* Feedback */}
                {answerState === "correct" && (
                  <div className="mt-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 animate-slide-in-up">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">Correct!</p>
                      {isQuadratic && quadQ && (
                        <p className="text-xs text-emerald-600 mt-0.5">
                          Roots: x = {quadQ.answer} and x = {quadQ.answer2}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {answerState === "incorrect" && (
                  <div className="mt-4 flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 animate-slide-in-up">
                    <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-rose-700">Not quite.</p>
                      {isQuadratic && quadQ ? (
                        <p className="text-xs text-rose-600 mt-0.5">
                          Correct roots: x = {quadQ.answer} and x = {quadQ.answer2}
                        </p>
                      ) : (
                        <p className="text-xs text-rose-600 mt-0.5">
                          Correct answer: {question.answer}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Solution */}
              {(showSolution || answerState !== "idle") && (
                <div className="px-6 pb-6">
                  <button
                    onClick={() => setShowSolution((v) => !v)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-3"
                  >
                    <BookOpen className="w-4 h-4" />
                    {showSolution ? "Hide solution" : "Show solution"}
                  </button>
                  {showSolution && (
                    <div className="bg-muted/50 border border-border rounded-lg px-4 py-4 animate-slide-in-up">
                      <MathLines text={question.solution} />
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="px-6 py-3 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
                <span>Question #{stats.total + (answerState === "idle" ? 1 : 0)}</span>
                <span>
                  {answerState === "idle"
                    ? "Start answering!"
                    : answerState === "correct"
                    ? "Press Enter for next"
                    : "Review the solution above"}
                </span>
              </div>
            </div>

            {/* Reference card */}
            {(activeCat.formulaRefs || activeCat.tips) && (
              <div className="mt-4 bg-card rounded-xl border border-border shadow-sm p-5">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Quick Reference
                </h3>
                {activeCat.formulaRefs && (
                  <div className="space-y-3 mb-3">
                    {activeCat.formulaRefs.map((ref) => (
                      <div key={ref.label} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                        <span className="text-xs text-muted-foreground flex-shrink-0 pt-1">{ref.label}:</span>
                        <div className="flex-1 overflow-x-auto">
                          <BlockMath latex={ref.formula} className="text-sm py-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeCat.tips && (
                  <ol className="space-y-1.5">
                    {activeCat.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">
                          {i + 1}
                        </span>
                        <MathText text={tip.text} />
                      </li>
                    ))}
                  </ol>
                )}
                {activeCat.id === "exponents" && (
                  <div className="mt-4 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1.5">Want more exponent practice?</p>
                    <a
                      href="https://amc-practice.netlify.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      amc-practice.netlify.app
                    </a>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
