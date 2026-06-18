/**
 * Progress.tsx — Daily history page
 *
 * DESIGN: "Scientific Notebook" — same design language as Home.tsx
 * Shows a day-per-row table with per-category attempted/correct counts,
 * a goal-completion indicator, and summary sparkline bars.
 */

import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Calculator,
  ArrowLeft,
  CheckCircle2,
  Target,
  TrendingUp,
  Calendar,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_REGISTRY } from "@/lib/categories";
import {
  loadAllRecords,
  loadGoalConfig,
  goalForCategory,
  totalAttempted,
  totalCorrect,
  type DailyRecord,
} from "@/lib/storage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function AccuracyPill({ attempted, correct }: { attempted: number; correct: number }) {
  if (attempted === 0) return <span className="text-muted-foreground text-xs">—</span>;
  const pct = Math.round((correct / attempted) * 100);
  const color =
    pct >= 80 ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : pct >= 50 ? "bg-amber-100 text-amber-700 border-amber-200"
    : "bg-rose-100 text-rose-700 border-rose-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono border ${color}`}>
      {correct}/{attempted}
      <span className="opacity-60">({pct}%)</span>
    </span>
  );
}

function GoalBadge({ attempted, goal }: { attempted: number; goal: number }) {
  if (attempted === 0) return null;
  const done = attempted >= goal;
  return done ? (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
      <CheckCircle2 className="w-3.5 h-3.5" /> Done
    </span>
  ) : (
    <span className="text-xs text-muted-foreground font-mono">{attempted}/{goal}</span>
  );
}

// Mini horizontal bar for a cell
function MiniBar({ value, max }: { value: number; max: number }) {
  if (max === 0 || value === 0) return null;
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden w-full">
      <div
        className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-primary/60"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="score-badge text-2xl text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Progress() {
  const [records, setRecords] = useState<DailyRecord[]>(() => loadAllRecords());
  const goalConfig = loadGoalConfig();

  // Summary stats
  const summary = useMemo(() => {
    const totalDays = records.length;
    const allAttempted = records.reduce((s, r) => s + totalAttempted(r), 0);
    const allCorrect = records.reduce((s, r) => s + totalCorrect(r), 0);
    const goalDays = records.filter((r) =>
      CATEGORY_REGISTRY.every(
        (cat) => (r.categories[cat.id]?.attempted ?? 0) >= goalForCategory(goalConfig, cat.id)
      )
    ).length;
    const overallAcc = allAttempted > 0 ? Math.round((allCorrect / allAttempted) * 100) : 0;
    return { totalDays, allAttempted, allCorrect, goalDays, overallAcc };
  }, [records, goalConfig]);

  // Per-category totals
  const catTotals = useMemo(() =>
    CATEGORY_REGISTRY.map((cat) => {
      const attempted = records.reduce((s, r) => s + (r.categories[cat.id]?.attempted ?? 0), 0);
      const correct = records.reduce((s, r) => s + (r.categories[cat.id]?.correct ?? 0), 0);
      return { cat, attempted, correct };
    }), [records]);

  const handleClearHistory = () => {
    if (!window.confirm("Clear all history? This cannot be undone.")) return;
    localStorage.removeItem("mathpractice:daily_records");
    setRecords([]);
  };

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
          <Link href="/">
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-accent">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Practice</span>
            </button>
          </Link>
        </div>
      </header>

      <div className="container py-8 max-w-5xl mx-auto">
        {/* Page title */}
        <div className="mb-8">
          <h2 className="site-title text-3xl text-foreground mb-1">Progress History</h2>
          <p className="text-sm text-muted-foreground">
            Your daily practice log — per-category goals set in Settings.
          </p>
        </div>

        {records.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium text-foreground mb-1">No history yet</p>
            <p className="text-sm text-muted-foreground mb-6">Complete some practice problems and your daily records will appear here.</p>
            <Link href="/">
              <Button>Start Practicing</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <SummaryCard
                icon={<Calendar className="w-4 h-4" />}
                label="Days Practiced"
                value={summary.totalDays}
                sub="days with activity"
              />
              <SummaryCard
                icon={<Target className="w-4 h-4" />}
                label="Goal Days"
                value={summary.goalDays}
                sub={`of ${summary.totalDays} days`}
              />
              <SummaryCard
                icon={<TrendingUp className="w-4 h-4" />}
                label="Total Problems"
                value={summary.allAttempted}
                sub={`${summary.allCorrect} correct`}
              />
              <SummaryCard
                icon={<CheckCircle2 className="w-4 h-4" />}
                label="Overall Accuracy"
                value={`${summary.overallAcc}%`}
                sub={`${summary.allCorrect}/${summary.allAttempted}`}
              />
            </div>

            {/* Per-category totals */}
            <div className="bg-card rounded-xl border border-border shadow-sm mb-6 overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">All-time by Category</h3>
              </div>
              <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
                {catTotals.map(({ cat, attempted, correct }) => {
                  const Icon = cat.icon;
                  const acc = attempted > 0 ? Math.round((correct / attempted) * 100) : null;
                  return (
                    <div key={cat.id} className="px-5 py-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">{cat.label}</span>
                      </div>
                      <div className="score-badge text-2xl text-foreground">{attempted}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {correct} correct{acc !== null ? ` · ${acc}% accuracy` : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily history table */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Daily Log</h3>
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear history
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        Date
                      </th>
                      {CATEGORY_REGISTRY.map((cat) => {
                        const Icon = cat.icon;
                        return (
                          <th key={cat.id} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5 text-primary" />
                              {cat.label}
                            </div>
                          </th>
                        );
                      })}
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        Total
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        Goal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, idx) => {
                      const attempted = totalAttempted(record);
                      const correct = totalCorrect(record);
                      const allGoalsMet = CATEGORY_REGISTRY.every(
                        (cat) =>
                          (record.categories[cat.id]?.attempted ?? 0) >=
                          goalForCategory(goalConfig, cat.id)
                      );
                      return (
                        <tr
                          key={record.date}
                          className={`border-b border-border last:border-0 transition-colors hover:bg-muted/30 ${idx === 0 ? "bg-primary/5" : ""}`}
                        >
                          {/* Date */}
                          <td className="px-5 py-3 whitespace-nowrap">
                            <div className="font-medium text-foreground">{formatDate(record.date)}</div>
                            {idx === 0 && (
                              <div className="text-xs text-primary font-medium">Today</div>
                            )}
                          </td>

                          {/* Per-category cells */}
                          {CATEGORY_REGISTRY.map((cat) => {
                            const stat = record.categories[cat.id] ?? { attempted: 0, correct: 0 };
                            return (
                              <td key={cat.id} className="px-4 py-3">
                                <AccuracyPill attempted={stat.attempted} correct={stat.correct} />
                                <MiniBar value={stat.attempted} max={goalForCategory(goalConfig, cat.id)} />
                              </td>
                            );
                          })}

                          {/* Total */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <AccuracyPill attempted={attempted} correct={correct} />
                          </td>

                          {/* Goal status */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {allGoalsMet ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Complete
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {CATEGORY_REGISTRY.filter(
                                  (cat) =>
                                    (record.categories[cat.id]?.attempted ?? 0) >=
                                    goalForCategory(goalConfig, cat.id)
                                ).length}/{CATEGORY_REGISTRY.length} categories
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
