interface InterventionTabProps {
  loadingInterventions: boolean;
  interventionPlans: string[];
  saving: boolean;
  onSaveSession: () => void;
  onNavigateToResult: () => void;
  onBeginDiagnosis: () => void;
}

export function InterventionTab({
  loadingInterventions,
  interventionPlans,
  saving,
  onSaveSession,
  onNavigateToResult,
  onBeginDiagnosis,
}: InterventionTabProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-semibold">Intervention Plans</h2>
        <p className="text-emerald-200">Generating personalized strategies based on your diagnosis...</p>
      </div>
      
      {loadingInterventions ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-lime-300"></div>
          <p className="mt-4 text-emerald-200">Generating intervention plan. This will take a while...</p>
        </div>
      ) : interventionPlans.length > 0 ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-lime-600/50 bg-lime-950/30 p-6">
            <h3 className="text-lg font-semibold text-lime-200 mb-4">Your Personalized Intervention Plans</h3>
            <div className="space-y-3">
              {interventionPlans.map((plan, index) => (
                <div key={index} className="p-4 rounded-lg border border-emerald-800 bg-emerald-950/60">
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-lime-300 text-emerald-950 rounded-full flex items-center justify-center text-sm font-semibold">{index + 1}</span>
                    <p className="text-emerald-100">{plan}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-center space-y-3">
            <button
              type="button"
              onClick={onSaveSession}
              disabled={saving}
              className="rounded-xl bg-lime-300 px-8 py-4 text-lg font-bold text-emerald-950 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving..." : "Save Diagnosis & Plans"}
            </button>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onNavigateToResult}
              className="rounded-xl border border-emerald-800 px-6 py-3 text-sm hover:border-lime-500"
            >
              Back to Diagnosis
            </button>
            <button
              type="button"
              onClick={onBeginDiagnosis}
              disabled={false}
              className="rounded-xl bg-lime-300 px-6 py-3 text-sm font-semibold text-emerald-950 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              New Diagnosis
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-emerald-200">No intervention plans available. Please complete the diagnosis first.</p>
          <button
            type="button"
            onClick={onNavigateToResult}
            className="mt-4 rounded-xl border border-emerald-800 px-6 py-3 text-sm hover:border-lime-500"
          >
            Back to Diagnosis
          </button>
        </div>
      )}
    </div>
  );
}
