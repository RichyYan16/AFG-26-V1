interface IntroductionTabProps {
  loading: boolean;
  onStartQuestionnaire: () => void;
  onResetToHome: () => void;
}

export function IntroductionTab({ loading, onStartQuestionnaire, onResetToHome }: IntroductionTabProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold">What This App Does</h2>
          <div className="mx-auto w-16 h-1 bg-lime-300 rounded-full"></div>
        </div>
        
        <div className="space-y-4 text-emerald-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-lime-300 text-emerald-950 rounded-full flex items-center justify-center text-sm font-semibold">1</div>
            <div>
              <h3 className="font-semibold text-emerald-100">Quick Assessment</h3>
              <p className="text-sm">We ask 5 research-based questions to understand why you&apos;re stuc. Then, our app asks 5 follow-up questions based on your previous responses to help narrow down the app's prediction.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-lime-300 text-emerald-950 rounded-full flex items-center justify-center text-sm font-semibold">2</div>
            <div>
              <h3 className="font-semibold text-emerald-100">Smart Analysis</h3>
              <p className="text-sm">Our algorithm analyzes your responses to identify your specific type of academic paralysis</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-lime-300 text-emerald-950 rounded-full flex items-center justify-center text-sm font-semibold">3</div>
            <div>
              <h3 className="font-semibold text-emerald-100">Personalized Plan</h3>
              <p className="text-sm">Get a customized intervention plan with specific steps to get you unstuck</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-xl border border-lime-600/50 bg-lime-950/30 p-4">
          <h3 className="text-lg font-semibold text-lime-200 mb-2">About the Questionnaire</h3>
          <p className="text-sm text-emerald-200">
            This brief questionnaire helps predict academic paralysis - that feeling when you know what you need to do but can&apos;t seem to start.
            Based on research with students and professors, we identify patterns that keep you stuck.
          </p>
        </div>
        <div className="rounded-xl border border-red-600/50 bg-red-950/30 p-4">
          <h3 className="text-lg font-semibold text-red-200 mb-2">Disclaimer</h3>
          <p className="text-sm text-red-200">
            This tool is for informational purposes only and is not a substitute for professional advice. 
            If you are experiencing severe academic difficulties, please seek help from a qualified professional.
          </p>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onStartQuestionnaire}
          disabled={loading}
          className="rounded-xl bg-lime-300 px-6 py-3 text-sm font-semibold text-emerald-950 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Starting..." : "Start Questionnaire"}
        </button>
        <button
          type="button"
          onClick={onResetToHome}
          className="rounded-xl border border-emerald-800 px-6 py-3 text-sm hover:border-lime-500"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
