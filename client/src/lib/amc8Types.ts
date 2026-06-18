// AMC 8 Problem data types
// Scientific Notebook design — deep navy, slate-blue, off-white

export interface AnswerChoice {
  label: string; // "A" | "B" | "C" | "D" | "E"
  text: string;
}

export interface AMC8Problem {
  id: string; // e.g. "2019_p1"
  year: number;
  problem_number: number;
  difficulty: "medium" | "hard";
  source: string; // e.g. "2019 AMC 8 Problem 1"
  url: string; // AoPS wiki link
  problem_text: string; // may contain $$LaTeX$$
  answer_choices: AnswerChoice[];
  correct_answer: string; // "A" | "B" | "C" | "D" | "E"
  solution_text: string;
}

export interface AMC8Category {
  id: string;
  name: string;
  description: string;
  topic_tags: string[];
  problem_count: number;
  problems: AMC8Problem[];
}

export interface AMC8Data {
  categories: AMC8Category[];
  total_problems: number;
}
