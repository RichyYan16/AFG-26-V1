/*
Alerts component for displaying error messages and notices.
Used Claude Haiku 4.5 for alert styling

Prompt: Design an Alerts component for my Unstuck app that can display error messages and notices to users.
*/

/*
Interface for alert component props to display error messages and notices
errorMessage: A string representing the error message to be displayed. If empty, no error alert will be shown.
notice: A string representing the notice message to be displayed. If empty, no notice alert will be shown.
*/
interface AlertsProps {
  errorMessage: string;
  notice: string;
}

// React component that conditionally renders error and notice alerts based on the provided props.
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
