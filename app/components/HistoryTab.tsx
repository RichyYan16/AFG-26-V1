/**
 * Structure (Boilerplate) and styling of History Tab made with Claude Haiku 4.5
 * 
 * Prompt: I am trying to include tab with a list of past sessions, showing the stuck type, confidence, and summary for each. 
 * When I click on a session, it should expand to show the full intervention plan with steps, tips, and resources. 
 * I also want buttons to navigate to the Insights tab and to clear history. Give me boilerplate code to help me implement this
 * 
 * All logic was implemented by the authors
 */

import { useState } from "react";
import { STUCK_TYPE_LABELS, OUTCOME_LABELS } from "../constants";
import type { SessionRecord } from "@/model/new/types";


/** Props for HistoryTab component. 
 * Includes the session history and callback functions for navigating to insights, clearing history, and deleting individual sessions.
 * onNavigateToInsights: Callback to switch to the Insights tab when user clicks the button
 * onClearHistory: Callback to clear all session history when user clicks the button
 * onDeleteSession: Callback to delete a specific session from history when user clicks the delete button on a session entry
 * history: An array of SessionRecord objects representing the user's past sessions, ordered from most recent to oldest
 */ 
interface HistoryTabProps {
  history: SessionRecord[];
  onClearHistory: () => void;
  onDeleteSession: (sessionId: string) => void;
}

/** Custom react component that displays History tab with list of past sessions, expandable details, and action buttons 
 * - Displays a list of recent sessions (up to 6) with stuck type, confidence, and summary
 * - Each session can be expanded to show the full intervention plan with steps, tips, and resources
 * - Includes buttons to navigate to Insights tab and to clear all history
 * - Allows deleting individual sessions from history
 */
export function HistoryTab({ history, onClearHistory, onDeleteSession }: HistoryTabProps) {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const recentHistory = history.slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-900 bg-emerald-950/70 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
          Recent Sessions
        </h3>

        {/* List of recent sessions with expandable details. Checks if recentHistory is greater than 0 */}
        {recentHistory.length > 0 ? (
          <div className="mt-3 space-y-2">
            {recentHistory.map((session) => (
              <div key={session.id} className="rounded-lg border border-emerald-800 bg-emerald-950/60">
                <div className="flex items-start gap-2 p-3">
                  {/* Button to expand/collapse session details. Highlights the button when expanded */}
                  <button
                    type="button"
                    onClick={() => setExpandedSession(
                      expandedSession === session.id ? null : session.id
                    )}
                    className="flex-1 text-left hover:border-lime-500 rounded-lg p-1"
                  >
                    {/* Displays the stuck type label and confidence for each session. If sessionSummary is available, it also shows the primary plan headline and confidence percentage. */}
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
                  {/* Delete button for each session entry */}
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
                
                {/* Expanded details section that shows the full intervention plan with steps, tips, and resources when a session is expanded. Only shows if the current session is the one that is expanded. */}
                {expandedSession === session.id && (
                  <div className="border-t border-emerald-800 p-3 bg-emerald-950/40">
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-200 mb-2">Full Intervention Plan</h4>
                        <p className="text-sm text-emerald-300">{session.interventionPlan.headline}</p>
                        <p className="text-xs text-emerald-400 mt-1">{session.interventionPlan.whyItWorks}</p>
                      </div>
                      {/* Steps section that iterates through the steps in the intervention plan and displays the action, tip, and resources for each step. Only shows if steps are available in the intervention plan. */}
                      <div>
                        <h5 className="text-xs font-semibold text-emerald-200 mb-2">Steps:</h5>
                        <div className="space-y-2">
                          {session.interventionPlan.steps.map((step, index) => (
                            <div key={index} className="text-xs text-emerald-300">
                              <p className="font-medium">Step {index + 1}: {step.action}</p>
                              {step.tip && (
                                <p className="text-emerald-400 mt-1 ml-2">💡 {step.tip}</p>
                              )}
                              {/* Checks if resources are available for the step and displays them in a list format. Only shows if resources array is not empty. */}
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
            {/* Message to show when there are no saved sessions in history. Only shows if recentHistory length is 0. */}
            No saved sessions yet.
          </p>
        )}
      </div>

      {/* Action buttons to navigate to Insights tab and to clear all history. The Clear History button only shows if there is at least one session in history. */}
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
