import {
  createEmptyTypeCounts,
  type SessionRecord,
  type StudentProfile,
  type TrendInsight,
} from "./types";

export function buildStudentProfile(sessions: SessionRecord[]): StudentProfile {
  const byType = createEmptyTypeCounts();
  const bySubjectAndType: Record<string, number> = {};

  let totalMinutes = 0;
  for (const session of sessions) {
    byType[session.stuckType] += 1;
    totalMinutes += session.timeStuckMinutes;

    const key = `${session.subject}:${session.stuckType}`;
    bySubjectAndType[key] = (bySubjectAndType[key] ?? 0) + 1;
  }

  const averageTimeStuckMinutes =
    sessions.length === 0 ? 0 : totalMinutes / sessions.length;

  return {
    totalSessions: sessions.length,
    byType,
    bySubjectAndType,
    averageTimeStuckMinutes,
  };
}

function topEntry<T extends string>(
  entries: Record<T, number>,
): [T, number] | null {
  let bestKey: T | null = null;
  let bestValue = -1;

  for (const key of Object.keys(entries) as T[]) {
    const value = entries[key];
    if (value > bestValue) {
      bestKey = key;
      bestValue = value;
    }
  }

  return bestKey === null ? null : [bestKey, bestValue];
}

export function buildTrendInsights(sessions: SessionRecord[]): TrendInsight[] {
  if (sessions.length === 0) {
    return [];
  }

  const profile = buildStudentProfile(sessions);
  const insights: TrendInsight[] = [];

  const topType = topEntry(profile.byType);
  if (topType !== null && topType[1] > 0) {
    insights.push({
      key: "top_stuck_type",
      message: `Your most common blocker is ${topType[0].replace(
        "_",
        " ",
      )}, not laziness.`,
      confidence: sessions.length >= 10 ? "high" : "medium",
    });
  }

  const topSubjectType = topEntry(profile.bySubjectAndType);
  if (topSubjectType !== null && topSubjectType[1] >= 2) {
    const [subject, stuckType] = topSubjectType[0].split(":");
    insights.push({
      key: "subject_pattern",
      message: `Pattern detected: ${stuckType.replace(
        "_",
        " ",
      )} repeats most in ${subject}.`,
      confidence: topSubjectType[1] >= 4 ? "high" : "medium",
    });
  }

  const sundayOverwhelm = sessions.filter((session) => {
    if (session.stuckType !== "overwhelm") {
      return false;
    }

    const date = new Date(session.createdAt);
    return !Number.isNaN(date.getTime()) && date.getDay() === 0;
  }).length;

  if (sundayOverwhelm >= 2) {
    insights.push({
      key: "sunday_overwhelm",
      message: "Overwhelm spikes on Sunday. Pre-splitting tasks on Saturday may reduce freeze risk.",
      confidence: sundayOverwhelm >= 4 ? "high" : "medium",
    });
  }

  if (profile.averageTimeStuckMinutes >= 60) {
    insights.push({
      key: "stall_duration",
      message:
        "Average stuck duration is above 60 minutes. Earlier diagnosis check-ins may improve recovery speed.",
      confidence: profile.totalSessions >= 8 ? "high" : "medium",
    });
  }

  return insights;
}
