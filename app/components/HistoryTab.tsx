import { useState } from "react";
import { STUCK_TYPE_LABELS, OUTCOME_LABELS } from "../constants";
import type { SessionRecord } from "@/model/new/types";

interface HistoryTabProps {
  history: SessionRecord[];
  onClearHistory: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export function HistoryTab({ history, onClearHistory, onDeleteSession }: HistoryTabProps) {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
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
              <div key={session.id} className="rounded-lg border border-emerald-800 bg-emerald-950/60">
                <div className="flex items-start gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => setExpandedSession(
                      expandedSession === session.id ? null : session.id
                    )}
                    className="flex-1 text-left hover:border-lime-500 rounded-lg p-1"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {STUCK_TYPE_LABELS[session.stuckType]}
                      </p>
                      {session.sessionSummary && (
                        <div className="text-xs text-emerald-300 space-y-1">
                          <p>Plan: {session.sessionSummary.primaryPlanHeadline}</p>
                          <p>Confidence: {Math.round(session.sessionSummary.confidence * 100)}%</p>
                        </div>
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSession(session.id)}
                    className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-900/20"
                    title="Delete session"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                
                {expandedSession === session.id && (
                  <div className="border-t border-emerald-800 p-3 bg-emerald-950/40">
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-200 mb-2">Full Intervention Plan</h4>
                        <p className="text-sm text-emerald-300">{session.interventionPlan.headline}</p>
                        <p className="text-xs text-emerald-400 mt-1">{session.interventionPlan.whyItWorks}</p>
                      </div>
                      
                      <div>
                        <h5 className="text-xs font-semibold text-emerald-200 mb-2">Steps:</h5>
                        <div className="space-y-2">
                          {session.interventionPlan.steps.map((step, index) => (
                            <div key={index} className="text-xs text-emerald-300">
                              <p className="font-medium">Step {index + 1}: {step.action}</p>
                              {step.tip && (
                                <p className="text-emerald-400 mt-1 ml-2">💡 {step.tip}</p>
                              )}
                              {step.resources && step.resources.length > 0 && (
                                <div className="mt-1 ml-2">
                                  <p className="text-emerald-400 font-medium">Resources:</p>
                                  <ul className="text-emerald-400 list-disc list-inside">
                                    {step.resources.map((resource, resourceIndex) => (
                                      <li key={resourceIndex}>{resource}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="text-xs font-semibold text-emerald-200 mb-1">Reflection Prompt:</h5>
                        <p className="text-xs text-emerald-300 italic">{session.interventionPlan.reflectionPrompt}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-emerald-300">
            No saved sessions yet.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {history.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="rounded-lg border border-rose-700 px-4 py-2 text-sm text-rose-200 hover:border-rose-500"
          >
            Clear All History
          </button>
        )}
      </div>
    </div>
  );
}
