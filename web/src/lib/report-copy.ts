import type { RiskLevel } from "@/lib/types";

export interface WizardAnswers {
  drugs: string[];
  dosage: string;
  duration: string;
  symptoms: string[];
  severity: "low" | "medium" | "high" | "unknown";
  comments: string;
  attachmentName?: string;
}

/**
 * The wizard collects structured answers, but /extract only accepts
 * free-text `report_text` (docs/api-contracts.md) — it does its own NER
 * over prose, it doesn't take pre-structured fields. This composes a
 * plain-language narrative from the real answers so the real pipeline
 * still runs unmodified; the composed text is a faithful restatement of
 * what the patient entered, nothing added.
 */
export function composeReportText(answers: WizardAnswers): string {
  const parts: string[] = [];

  const drugList = answers.drugs.join(", ");
  if (answers.dosage || answers.duration) {
    parts.push(
      `I have been taking ${drugList}${answers.dosage ? ` (${answers.dosage})` : ""}${
        answers.duration ? ` for ${answers.duration}` : ""
      }.`,
    );
  } else if (drugList) {
    parts.push(`I have been taking ${drugList}.`);
  }

  if (answers.symptoms.length > 0) {
    parts.push(`I experienced ${answers.symptoms.join(", ")}.`);
  }

  if (answers.severity !== "unknown") {
    parts.push(`Severity: ${answers.severity}.`);
  }

  if (answers.comments.trim()) {
    parts.push(answers.comments.trim());
  }

  return parts.join(" ");
}

/**
 * Rule-based, risk_level-driven guidance — not an AI-generated clinical
 * recommendation. CLAUDE.md bans fabricating medical claims, so this is
 * deliberately static copy keyed off the real risk_level the backend
 * returned, not a "doctor recommendation" invented by an LLM.
 */
export function nextStepsFor(level: RiskLevel): string {
  switch (level) {
    case "high":
      return "Contact your prescribing doctor or a pharmacist promptly to discuss this report. If you're experiencing severe or worsening symptoms, seek urgent medical care.";
    case "medium":
      return "Consider contacting your prescribing doctor before your next dose to discuss this report and whether any adjustment is needed.";
    case "low":
      return "No urgent action is suggested by this assessment. Keep monitoring how you feel, and mention this report at your next appointment.";
  }
}

export const MEDICAL_DISCLAIMER =
  "This is an automated, evidence-linked assessment, not medical advice. For a medical emergency, contact your local emergency number.";
