// Tutor catalog with personality, subtitle, color tokens, smart actions.
import { Code2, Cog, FlaskConical, Briefcase, MessagesSquare, Sprout, Globe2 } from "lucide-react";

export type TutorId = "computing" | "engineering" | "science" | "business" | "language" | "agriculture" | "earth";

export type SmartAction = {
  key: string;
  label: string;
  cost: number;
};

export type Tutor = {
  id: TutorId;
  name: string;
  subtitle: string;
  icon: typeof Code2;
  // Tailwind classes for tutor accent
  accent: string;        // bg + text for chips/avatar
  bubble: string;        // soft bg for AI messages
  user: string;          // user bubble color
  inputAccent: string;   // send button bg
  placeholder: string;
  actions: SmartAction[];
};

export const TUTORS: Tutor[] = [
  {
    id: "computing",
    name: "Computing Tutor",
    subtitle: "Code. Build. Understand.",
    icon: Code2,
    accent: "bg-violet-500 text-white",
    bubble: "bg-violet-50 text-violet-950 border-violet-100",
    user: "bg-violet-500 text-white",
    inputAccent: "bg-violet-500",
    placeholder: "Ask about code, programming or systems…",
    actions: [
      { key: "show_code", label: "Show Code", cost: 0 },
      { key: "explain_more", label: "Explain Line-by-Line", cost: 1 },
      { key: "debug", label: "Debug This", cost: 1 },
    ],
  },
  {
    id: "engineering",
    name: "Engineering Tutor",
    subtitle: "Think. Solve. Build.",
    icon: Cog,
    accent: "bg-orange-500 text-white",
    bubble: "bg-orange-50 text-orange-950 border-orange-100",
    user: "bg-orange-500 text-white",
    inputAccent: "bg-orange-500",
    placeholder: "Ask engineering problems or concepts…",
    actions: [
      { key: "step_by_step", label: "Break it Down", cost: 0 },
      { key: "show_formula", label: "Show Formula", cost: 0 },
      { key: "deep", label: "Solve Step-by-Step", cost: 2 },
    ],
  },
  {
    id: "science",
    name: "Science Tutor",
    subtitle: "Understand the world simply",
    icon: FlaskConical,
    accent: "bg-emerald-500 text-white",
    bubble: "bg-emerald-50 text-emerald-950 border-emerald-100",
    user: "bg-emerald-500 text-white",
    inputAccent: "bg-emerald-500",
    placeholder: "Ask any science question…",
    actions: [
      { key: "simplify", label: "Simplify", cost: 0 },
      { key: "give_example", label: "Give Example", cost: 0 },
      { key: "visualize", label: "Visualize", cost: 0 },
    ],
  },
  {
    id: "business",
    name: "Business Tutor",
    subtitle: "Think like a strategist",
    icon: Briefcase,
    accent: "bg-amber-500 text-white",
    bubble: "bg-amber-50 text-amber-950 border-amber-100",
    user: "bg-amber-500 text-white",
    inputAccent: "bg-amber-500",
    placeholder: "Ask about business, finance or marketing…",
    actions: [
      { key: "case_study", label: "Give Case Study", cost: 1 },
      { key: "real_example", label: "Real Example", cost: 0 },
      { key: "strategy", label: "Explain Strategy", cost: 1 },
    ],
  },
  {
    id: "language",
    name: "Language Tutor",
    subtitle: "Speak and write better",
    icon: MessagesSquare,
    accent: "bg-sky-500 text-white",
    bubble: "bg-sky-50 text-sky-950 border-sky-100",
    user: "bg-sky-500 text-white",
    inputAccent: "bg-sky-500",
    placeholder: "Type or practice your language…",
    actions: [
      { key: "correct", label: "Correct Me", cost: 0 },
      { key: "improve_sentence", label: "Improve Sentence", cost: 1 },
      { key: "practice", label: "Practice Conversation", cost: 1 },
    ],
  },
  {
    id: "agriculture",
    name: "Agriculture Tutor",
    subtitle: "Learn practical farming",
    icon: Sprout,
    accent: "bg-green-600 text-white",
    bubble: "bg-green-50 text-green-950 border-green-100",
    user: "bg-green-600 text-white",
    inputAccent: "bg-green-600",
    placeholder: "Ask about crops, soil or farming…",
    actions: [
      { key: "tips", label: "Give Tips", cost: 0 },
      { key: "best_practice", label: "Best Practice", cost: 0 },
      { key: "common_mistakes", label: "Common Mistakes", cost: 1 },
    ],
  },
  {
    id: "earth",
    name: "Earth Sciences Tutor",
    subtitle: "Explore the planet",
    icon: Globe2,
    accent: "bg-teal-500 text-white",
    bubble: "bg-teal-50 text-teal-950 border-teal-100",
    user: "bg-teal-500 text-white",
    inputAccent: "bg-teal-500",
    placeholder: "Ask about geography or environment…",
    actions: [
      { key: "concept", label: "Explain Concept", cost: 0 },
      { key: "give_example", label: "Give Example", cost: 0 },
      { key: "why_matters", label: "Why it matters", cost: 1 },
    ],
  },
];

export const getTutor = (id: string | undefined) => TUTORS.find((t) => t.id === id) ?? null;
