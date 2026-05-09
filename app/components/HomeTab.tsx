import Image from "next/image";

/**
 * Initial landing page with a call-to-action to start the prediction process.
 * Used Claude Haiku 4.5 to generate styling for home tab (landing page) based on the following prompt:
 * 
 * Prompt: Design the Home tab for my Unstuck app. This is the initial landing page that users see when they open the app. It should have an engaging headline and a brief description of how the app works and how it can help the user. 
 * Include an illustrative image that visually represents the concept of getting "unstuck" in academic work. 
 * Use Tailwind CSS for styling and make sure it looks inviting and easy to understand for users who are feeling overwhelmed or stuck.
 * 
 * All logic was implemented by the authors
 */
interface HomeTabProps {
  loading: boolean;
  onBeginDiagnosis: () => void;
}

export function HomeTab({ loading, onBeginDiagnosis }: HomeTabProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Start When You Freeze</h2>
        <p className="max-w-3xl text-sm text-emerald-200 md:text-base">
          Feeling stuck on your academic work? Let us help you identify what&apos;s holding you back.
        </p>
      </div>

      <div className="rounded-xl border border-emerald-900 bg-emerald-950/60 p-4">
        <Image
          src="/images/diagnosis-flow.svg"
          alt="Assessment flow diagram"
          width={920}
          height={220}
          className="h-auto w-full rounded-lg border border-emerald-900"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onBeginDiagnosis}
          disabled={loading}
          className="rounded-2xl bg-lime-300 px-12 py-8 text-xl font-bold text-emerald-950 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          {loading ? "Starting..." : "I'M STUCK"}
        </button>
      </div>
    </div>
  );
}
