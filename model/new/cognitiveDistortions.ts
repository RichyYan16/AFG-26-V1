/**
 * Cognitive Distortion Detection
 * Identifies thought patterns (catastrophizing, all-or-nothing, etc.)
 * and crisis flags in student responses
 */

import { DISTORTION_WEIGHTS, CRISIS_WEIGHTS } from "./weights";
import type { DistortionHit } from "./types";

/**
 * Detect cognitive distortions in student's statements
 */
export function detectThoughtDistortions(input: {
  studentStatement?: string;
  selfTalk?: string[];
}): DistortionHit[] {
  const textArray = [
    input.studentStatement,
    ...(input.selfTalk || []),
  ].filter(Boolean) as string[];

  const text = textArray.join(" ").toLowerCase();
  const hits: DistortionHit[] = [];

  for (const [type, config] of Object.entries(DISTORTION_WEIGHTS)) {
    for (const pattern of config.patterns) {
      const matches = text.match(pattern);
      if (matches) {
        hits.push({
          type: type as DistortionHit["type"],
          severity: config.severity,
          matched: matches[0] || "",
        });
      }
    }
  }

  return hits;
}

/**
 * Build safety flags based on distortions, sentiment, and crisis patterns
 * Returns list of flags: "crisis:critical", "high_shame", etc.
 */
export function buildSafetyFlags(input: {
  studentStatement: string;
  shameScore?: number;
  panicScore?: number;
}): string[] {
  const flags: string[] = [];
  const text = input.studentStatement.toLowerCase();

  // Check for crisis language patterns
  for (const pattern of CRISIS_WEIGHTS.patterns) {
    if (pattern.text.test(text)) {
      flags.push(`crisis:${pattern.severity}`);
    }
  }

  // Check shame threshold
  if (input.shameScore && input.shameScore >= CRISIS_WEIGHTS.shameThreshold) {
    flags.push("high_shame");
  }

  // Check panic threshold
  if (input.panicScore && input.panicScore >= CRISIS_WEIGHTS.panicThreshold) {
    flags.push("high_panic");
  }

  // Check for repeated negative patterns
  const distortions = detectThoughtDistortions({
    studentStatement: input.studentStatement,
  });
  const criticalDistortions = distortions.filter((d) => d.severity >= 3);
  if (criticalDistortions.length >= 2) {
    flags.push("multiple_severe_distortions");
  }

  return [...new Set(flags)]; // Remove duplicates
}

/**
 * Get human-readable distortion reframes
 * Shows the student an alternative perspective
 */
export const DISTORTION_REFRAMES: Record<string, string> = {
  catastrophizing:
    "Your mind jumped to the worst case. What's the most likely case?",
  allOrNothing:
    "There's usually middle ground. What's one thing you could do imperfectly?",
  mindReading:
    "You can't read their mind. What's a kindly interpretation instead?",
  shouldStatements:
    "Replace 'should' with 'want to' or 'choose to.' How does that feel?",
  overgeneralization:
    "This one thing ≠ everything. What's one time this went differently?",
};

/**
 * Build a distortion report (for transparency/reflection)
 */
export interface DistortionReport {
  totalDistortions: number;
  byType: Record<string, number>;
  topDistortion: string | null;
  reframe: string | null;
  riskLevel: "low" | "medium" | "high" | "critical";
}

export function buildDistortionReport(
  studentStatement: string,
): DistortionReport {
  const distortions = detectThoughtDistortions({
    studentStatement,
  });

  const byType = distortions.reduce(
    (acc, d) => {
      acc[d.type] = (acc[d.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topDistortion = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
  const flags = buildSafetyFlags({
    studentStatement,
  });

  let riskLevel: "low" | "medium" | "high" | "critical" = "low";
  if (flags.includes("crisis:critical")) riskLevel = "critical";
  else if (flags.some((f) => f.startsWith("crisis:"))) riskLevel = "high";
  else if (flags.includes("multiple_severe_distortions")) riskLevel = "medium";

  return {
    totalDistortions: distortions.length,
    byType,
    topDistortion: topDistortion?.[0] || null,
    reframe: topDistortion
      ? DISTORTION_REFRAMES[topDistortion[0]]
      : null,
    riskLevel,
  };
}