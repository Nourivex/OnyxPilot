/**
 * Plan Engine v1 — MURNI. Prompt perencana + parser struktur yang toleran.
 * Parser tidak pernah melempar: section hilang → string kosong / array kosong.
 */
import type { AIRequest } from "../ai/provider";
import type {
  Plan,
  PlanFile,
  PlanFileAction,
  PlanStep,
  ValidationStep
} from "./types";

export function buildPlanRequest(
  projectLine: string,
  goal: string,
  contextBlock: string
): AIRequest {
  return {
    system: [
      "You are Onyx, a careful software planner inside VS Code.",
      "Create an implementation PLAN. Do NOT write the final code.",
      "Rules:",
      "- Answer in Bahasa Indonesia.",
      "- Base the plan ONLY on the [Context]. Never invent files.",
      "- If context is insufficient, say so under CURRENT STATE and keep steps to inspection steps.",
      "- Planning does not imply permission to modify anything.",
      "- Use EXACTLY these headers, in order:",
      "  # GOAL",
      "  # CURRENT STATE",
      "  # FILES",
      "  # STEPS",
      "  # RISKS",
      "  # VALIDATION",
      "- Under FILES, one per line: `- path | read|modify|create | reason`.",
      "- Under STEPS, numbered list. Under RISKS and VALIDATION, bullet list."
    ].join("\n"),
    user: [`[Project: ${projectLine}]`, `[Goal]\n${goal}`, `[Context]\n${contextBlock}`].join(
      "\n\n"
    )
  };
}

const HEADERS = [
  "GOAL",
  "CURRENT STATE",
  "FILES",
  "STEPS",
  "RISKS",
  "VALIDATION"
] as const;

function splitSections(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = text.split("\n");
  let current: string | null = null;
  const buf: string[] = [];
  const flush = () => {
    if (current !== null) {
      out[current] = buf.join("\n").trim();
    }
    buf.length = 0;
  };
  for (const line of lines) {
    const m = line.match(/^#{1,3}\s*(.+?)\s*$/);
    const name = m ? m[1].trim().toUpperCase() : "";
    if (m && (HEADERS as readonly string[]).includes(name)) {
      flush();
      current = name;
    } else if (current !== null) {
      buf.push(line);
    }
  }
  flush();
  return out;
}

function bullets(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^(\s*([-*]|\d+[.)])\s*)/, "").trim())
    .filter((l) => l.length > 0);
}

function parseFiles(text: string): PlanFile[] {
  const files: PlanFile[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*[-*]\s*(\S+)\s*(?:\|\s*(\w+))?\s*(?:\|\s*(.*))?$/);
    if (!m) {
      continue;
    }
    const action = (m[2] ?? "read").toLowerCase();
    files.push({
      path: m[1],
      action: (["read", "modify", "create"] as PlanFileAction[]).includes(
        action as PlanFileAction
      )
        ? (action as PlanFileAction)
        : "read",
      reason: (m[3] ?? "").trim()
    });
  }
  return files;
}

/** Parse markdown plan model menjadi Plan (confidence diisi engine). */
export function parsePlan(text: string, goal: string): Plan {
  const s = splitSections(text);
  const steps: PlanStep[] = bullets(s["STEPS"] ?? "").map((title) => ({ title }));
  const validation: ValidationStep[] = bullets(s["VALIDATION"] ?? "").map(
    (t) => ({ text: t })
  );
  return {
    goal,
    currentState: s["CURRENT STATE"] ?? "",
    files: parseFiles(s["FILES"] ?? ""),
    steps,
    risks: bullets(s["RISKS"] ?? ""),
    validation,
    confidence: "sufficient",
    missingContext: []
  };
}
