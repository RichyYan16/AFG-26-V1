interface AlertsProps {
  errorMessage: string;
  notice: string;
}

export function Alerts({ errorMessage, notice }: AlertsProps) {
  return (
    <>
      {errorMessage ? (
        <div className="rounded-xl border border-rose-700 bg-rose-950/60 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-700 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-200 animate-pulse">
          {notice}
        </div>
      ) : null}
    </>
  );
}
