import { STUCK_TYPE_LABELS, OUTCOME_LABELS } from "../constants";
import type { SessionRecord } from "@/model/new/types";

interface HistoryTabProps {
  history: SessionRecord[];
  onNavigateToInsights: () => void;
}

export function HistoryTab({ history, onNavigateToInsights }: HistoryTabProps) {
  const recentHistory = history.slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-900 bg-emerald-950/70 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
          Recent Sessions
        </h3>

        {recentHistory.length > 0 ? (
          <div className="mt-3 space-y-2">
            {recentHistory.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => {
                  console.log(`Reviewing ${STUCK_TYPE_LABELS[session.stuckType]} session.`);
                }}
                className="w-full rounded-lg border border-emerald-800 bg-emerald-950/60 p-3 text-left hover:border-lime-500"
              >
                <p className="text-sm">
                  {STUCK_TYPE_LABELS[session.stuckType]} -{" "}
                  {OUTCOME_LABELS[session.outcome]}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-emerald-300">
            No saved sessions yet.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onNavigateToInsights}
          className="rounded-lg border border-emerald-800 px-4 py-2 text-sm hover:border-lime-500"
        >
          Open Insights Tab
        </button>
      </div>
    </div>
  );
}
