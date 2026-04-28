import { STUCK_TYPE_LABELS } from "../constants";
import type { DiagnosisResult } from "@/model/new/types";

interface ResultTabProps {
  diagnosis: DiagnosisResult | null;
  loadingInterventions: boolean;
  onGenerateInterventions: () => void;
  onNavigateToIntervention: () => void;
}

export function ResultTab({ diagnosis, loadingInterventions, onGenerateInterventions, onNavigateToIntervention }: ResultTabProps) {
  return (
    <div className="space-y-5">
      {diagnosis ? (
        <>
          <div className="rounded-xl border border-lime-600/50 bg-lime-950/30 p-6">
            <div className="text-center space-y-4">
              <p className="text-xs uppercase tracking-wide text-lime-200">
                ----------Diagnosis----------------
              </p>
              <h2 className="text-3xl font-bold text-lime-200">
                {STUCK_TYPE_LABELS[diagnosis.primaryType]}
              </h2>
            </div>
            
            <div className="mt-6 space-y-3">
              <h3 className="text-lg font-semibold text-emerald-100">Overall confidence levels for each stuck type</h3>
              <div className="space-y-2">
                {diagnosis.rankedTypes
                  .sort((a, b) => b.normalized - a.normalized)
                  .map((item, index) => (
                    <div key={item.type} className="flex items-center justify-between p-3 rounded-lg border border-emerald-800 bg-emerald-950/40">
                      <div className="flex items-center space-x-3">
                        <span className="text-lime-200 font-semibold">#{index + 1}</span>
                        <span className="text-emerald-100">{STUCK_TYPE_LABELS[item.type]}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 h-2 bg-emerald-900 rounded-full">
                          <div 
                            className="h-full bg-lime-300 rounded-full" 
                            style={{ width: `${Math.round(item.normalized * 100)}%` }}
                          />
                        </div>
                        <span className="text-emerald-200 text-sm w-12 text-right">
                          {Math.round(item.normalized * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            
            <div className="mt-6 text-center space-y-3">
              <p className="text-xs uppercase tracking-wide text-lime-200">
                -----Very Brief Summary--------
              </p>
              <p className="text-emerald-100 text-sm leading-relaxed">
                {diagnosis.summary}
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
              {loadingInterventions ? "Loading..." : "What's the plan?"}
            </button>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-emerald-900 bg-emerald-950/60 p-4 text-sm text-emerald-200">
          No diagnosis found. Complete the questionnaire to see your results.
        </div>
      )}
    </div>
  );
}
