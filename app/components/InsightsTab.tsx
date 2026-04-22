import type { TrendInsight, StudentProfile } from "@/model/new/types";

interface InsightsTabProps {
  insights: TrendInsight[];
  profile: StudentProfile | null;
  onNavigateToHistory: () => void;
  onNavigateToResult: () => void;
  hasDiagnosis: boolean;
}

export function InsightsTab({
  insights,
  profile,
  onNavigateToHistory,
  onNavigateToResult,
  hasDiagnosis,
}: InsightsTabProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-900 bg-emerald-950/70 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
          Insights
        </h3>
        {insights.length > 0 ? (
          <div className="mt-3 space-y-2">
            {insights.map((insight, index) => (
              <div
                key={`insight-${index}`}
                className="rounded-lg border border-emerald-800 bg-emerald-950/60 p-3"
              >
                <p className="text-xs text-emerald-300">
                  {insight.type} (Severity: {insight.severity})
                </p>
                <p className="mt-1 text-sm">{insight.description}</p>
                <p className="mt-1 text-xs text-emerald-400">-&gt; {insight.recommendation}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-emerald-300">
            Save sessions to generate behavioral insights.
          </p>
        )}

        {profile ? (
          <div className="mt-4 rounded-lg border border-emerald-800 bg-emerald-950/60 p-3">
            <p className="text-xs text-emerald-300">Profile Summary</p>
            <p className="mt-1 text-sm">Sessions: {profile.totalSessions}</p>
            <p className="text-sm">
              Avg stuck time: {Math.round(profile.averageTimeStuckMinutes)} min
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onNavigateToHistory}
          className="rounded-lg border border-emerald-800 px-4 py-2 text-sm hover:border-lime-500"
        >
          Open History Tab
        </button>
        <button
          type="button"
          onClick={onNavigateToResult}
          disabled={!hasDiagnosis}
          className="rounded-lg border border-emerald-800 px-4 py-2 text-sm hover:border-lime-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Back To Plan Tab
        </button>
      </div>
    </div>
  );
}
