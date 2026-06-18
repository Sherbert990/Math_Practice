/**
 * Categories.tsx — Category Management Page
 *
 * Design: Scientific Notebook — off-white bg, deep navy headings,
 * slate-blue accents, Source Serif 4 for body, JetBrains Mono for math.
 *
 * Layout: Left sidebar (category list) + Right main panel (problem browser)
 */

import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useAMC8Data } from "@/hooks/useAMC8Data";
import type { AMC8Category, AMC8Problem } from "@/lib/amc8Types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Tag,
  BarChart2,
} from "lucide-react";
import { InlineMath, BlockMath } from "@/components/Math";

// ─── Helper: render problem text that may contain $$...$$ ─────────────────────
function renderMathText(text: string) {
  if (!text) return null;
  // Split on $$...$$ blocks
  const parts = text.split(/(\$\$[^$]+\$\$)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          const latex = part.slice(2, -2);
          return <InlineMath key={i} latex={latex} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ─── Difficulty badge ─────────────────────────────────────────────────────────
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const isHard = difficulty === "hard";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono ${
        isHard
          ? "bg-rose-50 text-rose-700 border border-rose-200"
          : "bg-amber-50 text-amber-700 border border-amber-200"
      }`}
    >
      {isHard ? "Hard" : "Medium"}
    </span>
  );
}

// ─── Single problem card ──────────────────────────────────────────────────────
function ProblemCard({ problem }: { problem: AMC8Problem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg bg-white hover:border-slate-300 transition-colors">
      {/* Header row */}
      <button
        className="w-full text-left px-4 py-3 flex items-start gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono text-slate-500 font-medium">
              {problem.source}
            </span>
            <DifficultyBadge difficulty={problem.difficulty} />
          </div>
          <div className="text-sm text-slate-800 leading-relaxed line-clamp-2 font-serif">
            {renderMathText(problem.problem_text || "(Problem text not available)")}
          </div>
        </div>
        <div className="flex-shrink-0 mt-0.5 text-slate-400">
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3">
          {/* Full problem text */}
          {problem.problem_text && (
            <div className="text-sm text-slate-700 leading-relaxed font-serif">
              {renderMathText(problem.problem_text)}
            </div>
          )}

          {/* Answer choices */}
          {problem.answer_choices && problem.answer_choices.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {problem.answer_choices.map((choice) => (
                <span
                  key={choice.label}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-mono ${
                    choice.label === problem.correct_answer
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  <span className="font-bold">({choice.label})</span>
                  <span>{renderMathText(choice.text)}</span>
                  {choice.label === problem.correct_answer && (
                    <span className="text-emerald-600 ml-0.5">✓</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Solution */}
          {problem.solution_text && (
            <div className="bg-slate-50 rounded-md p-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Solution
              </div>
              <div className="text-sm text-slate-700 leading-relaxed font-serif">
                {renderMathText(problem.solution_text)}
              </div>
            </div>
          )}

          {/* Link to AoPS */}
          <a
            href={problem.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
            View on AoPS Wiki
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Category sidebar item ────────────────────────────────────────────────────
function CategorySidebarItem({
  category,
  isSelected,
  onSelect,
}: {
  category: AMC8Category;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
        isSelected
          ? "bg-navy-800 bg-[#1e3a5f] text-white"
          : "hover:bg-slate-100 text-slate-700"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-sm font-medium leading-tight ${
            isSelected ? "text-white" : "text-slate-800"
          }`}
        >
          {category.name}
        </span>
        <span
          className={`text-xs font-mono ml-2 flex-shrink-0 ${
            isSelected ? "text-slate-300" : "text-slate-400"
          }`}
        >
          {category.problem_count}
        </span>
      </div>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Categories() {
  const { data, loading, error } = useAMC8Data();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "medium" | "hard">("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [sidebarSearch, setSidebarSearch] = useState("");

  // Derived: selected category
  const selectedCategory = useMemo(() => {
    if (!data || !selectedCategoryId) return null;
    return data.categories.find((c) => c.id === selectedCategoryId) ?? null;
  }, [data, selectedCategoryId]);

  // Filtered categories for sidebar
  const filteredCategories = useMemo(() => {
    if (!data) return [];
    if (!sidebarSearch.trim()) return data.categories;
    const q = sidebarSearch.toLowerCase();
    return data.categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.topic_tags.some((t) => t.includes(q))
    );
  }, [data, sidebarSearch]);

  // Available years in selected category
  const availableYears = useMemo(() => {
    if (!selectedCategory) return [];
    const yearSet = new Set(selectedCategory.problems.map((p) => p.year));
    const years = Array.from(yearSet).sort();
    return years;
  }, [selectedCategory]);

  // Filtered problems
  const filteredProblems = useMemo(() => {
    if (!selectedCategory) return [];
    return selectedCategory.problems.filter((p) => {
      if (difficultyFilter !== "all" && p.difficulty !== difficultyFilter) return false;
      if (yearFilter !== "all" && String(p.year) !== yearFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !p.problem_text.toLowerCase().includes(q) &&
          !p.source.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [selectedCategory, difficultyFilter, yearFilter, searchQuery]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f6f1] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f] mx-auto" />
          <p className="text-slate-600 font-serif">Loading AMC 8 problem database…</p>
          <p className="text-xs text-slate-400">675 problems from 1999–2026</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8f6f1] flex items-center justify-center">
        <div className="text-center space-y-3 max-w-md">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-slate-700 font-serif">Failed to load problem data</p>
          <p className="text-xs text-slate-500 font-mono">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#f8f6f1] flex flex-col">
      {/* ── Top nav ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/">
            <button className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              <span>Practice</span>
            </button>
          </Link>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#1e3a5f]" />
            <span className="font-semibold text-[#1e3a5f] text-sm">Category Management</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <BarChart2 className="w-3.5 h-3.5" />
          <span>{data.total_problems} problems · AMC 8 1999–2026</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar: category list ──────────────────────────────────── */}
        <aside className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Search categories…"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                className="pl-8 h-8 text-sm bg-slate-50 border-slate-200"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {filteredCategories.map((cat) => (
              <CategorySidebarItem
                key={cat.id}
                category={cat}
                isSelected={selectedCategoryId === cat.id}
                onSelect={() => {
                  setSelectedCategoryId(cat.id);
                  setSearchQuery("");
                  setDifficultyFilter("all");
                  setYearFilter("all");
                }}
              />
            ))}
          </div>
          <div className="p-3 border-t border-slate-100 text-xs text-slate-400 font-mono">
            {data.categories.length} categories
          </div>
        </aside>

        {/* ── Right main panel ─────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          {!selectedCategory ? (
            // ── Empty state ────────────────────────────────────────────────
            <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <BookOpen className="w-7 h-7 text-slate-400" />
              </div>
              <h2 className="text-xl font-semibold text-[#1e3a5f] mb-2 font-serif">
                Select a Category
              </h2>
              <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                Choose a math topic from the sidebar to browse its AMC 8 sample
                problems, filter by difficulty or year, and view full solutions.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 max-w-sm w-full">
                {data.categories.slice(0, 6).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className="text-left p-3 rounded-lg border border-slate-200 bg-white hover:border-[#1e3a5f] hover:bg-slate-50 transition-all"
                  >
                    <div className="text-xs font-semibold text-slate-700 leading-tight mb-1">
                      {cat.name}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {cat.problem_count} problems
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // ── Category detail ────────────────────────────────────────────
            <div className="p-6 max-w-4xl">
              {/* Category header */}
              <div className="mb-5">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h1 className="text-2xl font-bold text-[#1e3a5f] font-serif leading-tight">
                    {selectedCategory.name}
                  </h1>
                  <span className="flex-shrink-0 text-sm font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">
                    {selectedCategory.problem_count} problems
                  </span>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-3">
                  {selectedCategory.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCategory.topic_tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1e3a5f]/8 text-[#1e3a5f] text-xs rounded border border-[#1e3a5f]/20"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-4 p-3 bg-white rounded-lg border border-slate-200">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    placeholder="Search problems…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <Select
                  value={difficultyFilter}
                  onValueChange={(v) => setDifficultyFilter(v as "all" | "medium" | "hard")}
                >
                  <SelectTrigger className="h-8 w-32 text-sm">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All levels</SelectItem>
                    <SelectItem value="medium">Medium (≤15)</SelectItem>
                    <SelectItem value="hard">Hard (≥16)</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={yearFilter}
                  onValueChange={setYearFilter}
                >
                  <SelectTrigger className="h-8 w-28 text-sm">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All years</SelectItem>
                    {availableYears.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(searchQuery || difficultyFilter !== "all" || yearFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-slate-500"
                    onClick={() => {
                      setSearchQuery("");
                      setDifficultyFilter("all");
                      setYearFilter("all");
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Results count */}
              <div className="text-xs text-slate-400 font-mono mb-3">
                Showing {filteredProblems.length} of {selectedCategory.problem_count} problems
              </div>

              {/* Problem list */}
              {filteredProblems.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Filter className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No problems match your filters</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProblems.map((problem) => (
                    <ProblemCard key={problem.id} problem={problem} />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
