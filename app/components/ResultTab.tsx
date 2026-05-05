import { useState, useEffect } from "react";
import { STUCK_TYPE_LABELS, STUCK_TYPE_DESCRIPTIONS } from "../constants";
import { generateAISummary } from "../services/diagnosis";
import type { DiagnosisResult, TypeScore } from "@/model/new/types";

interface ResultTabProps {
  diagnosis: DiagnosisResult | null;
  loadingInterventions: boolean;
  onGenerateInterventions: () => void;
  onNavigateToIntervention: () => void;
}

export function ResultTab({ diagnosis, loadingInterventions, onGenerateInterventions, onNavigateToIntervention }: ResultTabProps) {
  const [aiSummary, setAiSummary] = useState<string>("");
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);

  // Calculate normalized percentages that add up to 100%
  const getNormalizedPercentages = (rankedTypes: TypeScore[]) => {
    if (!rankedTypes || rankedTypes.length === 0) return [];
    const totalScore = rankedTypes.reduce((sum, item) => sum + item.normalized, 0);
    return rankedTypes.map(item => ({
      ...item,
      percentage: totalScore > 0 ? (item.normalized / totalScore) * 100 : 0
    }));
  };

  // Generate AI summary when diagnosis changes
  useEffect(() => {
    if (diagnosis) {
      setLoadingSummary(true);
      generateAISummary(diagnosis)
        .then((summary) => {
          setAiSummary(summary);
        })
        .catch((error) => {
          console.error("Failed to generate AI summary:", error);
        })
        .finally(() => {
          setLoadingSummary(false);
        });
    } else {
      setAiSummary("");
    }
  }, [diagnosis]);

  return (
    <div className="space-y-5">
      {diagnosis ? (
        <>
          <div className="rounded-xl border border-lime-600/50 bg-lime-950/30 p-6">
            <div className="text-center space-y-4">
              <p className="text-xs uppercase tracking-wide text-lime-200">
                ----------Assessment----------------
              </p>
              <h2 className="text-3xl font-bold text-lime-200">
                {STUCK_TYPE_LABELS[diagnosis.primaryType]}
              </h2>
            </div>
            
            <div className="mt-6 space-y-3">
              <h3 className="font-semibold text-emerald-100">Quick Assessment</h3>
              <div className="space-y-2">
                {getNormalizedPercentages(diagnosis.rankedTypes)
                  .sort((a, b) => b.percentage - a.percentage)
                  .map((item, index) => (
                    <div key={item.type} className="flex items-start justify-between p-3 rounded-lg border border-emerald-800 bg-emerald-950/40">
                      <div className="flex items-start space-x-3 flex-1">
                        <span className="text-lime-200 font-semibold">#{index + 1}</span>
                        <div className="flex-1">
                          <span className="text-emerald-100">{STUCK_TYPE_LABELS[item.type]}</span>
                          <p className="text-xs text-emerald-300 mt-1 leading-relaxed">
                            {STUCK_TYPE_DESCRIPTIONS[item.type]}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <div className="w-24 h-2 bg-emerald-900 rounded-full">
                          <div 
                            className="h-full bg-lime-300 rounded-full" 
                            style={{ width: `${Math.round(item.percentage)}%` }}
                          />
                        </div>
                        <span className="text-emerald-200 text-sm w-12 text-right">
                          {Math.round(item.percentage)}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            
            <div className="mt-6 text-center space-y-3">
              <p className="text-xs uppercase tracking-wide text-lime-200">
                -----Summary-----
              </p>
              <p className="text-emerald-200 italic">
                {loadingSummary ? (
                  <span className="animate-pulse">Generating personalized summary...</span>
                ) : (
                  aiSummary || `You're experiencing ${STUCK_TYPE_LABELS[diagnosis.primaryType].toLowerCase()}, which means ${STUCK_TYPE_DESCRIPTIONS[diagnosis.primaryType].toLowerCase()} This is affecting your ability to make progress on your academic work.`
                )}
              </p>
            </div>
          </div>
          
          <div className="text-center">
            <button
              type="button"
              onClick={onGenerateInterventions}
              disabled={loadingInterventions}
              className="rounded-xl bg-lime-300 px-8 py-4 text-lg font-bold text-emerald-950 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
            >
              {loadingInterventions ? "Starting..." : "Continue to Plan"}
            </button>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-emerald-900 bg-emerald-950/60 p-4 text-sm text-emerald-200">
          No active assessment session yet.
        </div>
      )}
    </div>
  );
}
