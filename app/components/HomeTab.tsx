import Image from "next/image";

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
          alt="Diagnosis flow diagram"
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
