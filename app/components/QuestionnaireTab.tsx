import { QUESTION_TITLES } from "../constants";
import type { AdaptiveQuestion, DiagnosticAnswers } from "@/model/new/types";

interface QuestionnaireTabProps {
  questionQueue: AdaptiveQuestion[];
  currentQuestionIndex: number;
  answers: Partial<DiagnosticAnswers>;
  openResponses: Record<string, string>;
  geminiQuestions: AdaptiveQuestion[];
  currentGeminiIndex: number;
  loading: boolean;
  answeredCount: number;
  progressPercent: number;
  onUpdateAnswer: (questionId: AdaptiveQuestion["id"], value: string) => void;
  onUpdateOpenResponse: (questionId: string, value: string) => void;
  onHandleNextQuestion: () => void;
  onHandlePreviousQuestion: () => void;
  onResetToHome: () => void;
  onBeginDiagnosis: () => void;
}

export function QuestionnaireTab({
  questionQueue,
  currentQuestionIndex,
  answers,
  openResponses,
  geminiQuestions,
  currentGeminiIndex,
  loading,
  answeredCount,
  progressPercent,
  onUpdateAnswer,
  onUpdateOpenResponse,
  onHandleNextQuestion,
  onHandlePreviousQuestion,
  onResetToHome,
  onBeginDiagnosis,
}: QuestionnaireTabProps) {
  const currentQuestion = questionQueue[currentQuestionIndex] ?? null;
  const activeQuestion = geminiQuestions.length > 0
    ? geminiQuestions[currentGeminiIndex]
    : currentQuestion;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-emerald-900 bg-emerald-950/60 p-4">
        <div className="flex items-center justify-between text-xs text-emerald-300">
          <span>Adaptive Questionnaire</span>
          <span>
            {answeredCount}/{questionQueue.length} answered
          </span>
        </div>
        <div className="h-2 rounded-full bg-emerald-900">
          <div
            className="h-full rounded-full bg-lime-300 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {currentQuestion ? (
        <div className="space-y-4 rounded-xl border border-emerald-900 bg-emerald-950/60 p-4 md:p-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-lime-200">
              {geminiQuestions.length > 0 
                ? `Follow-up Question ${currentGeminiIndex + 1} of ${geminiQuestions.length}`
                : `Question ${currentQuestionIndex + 1} of ${questionQueue.length}`
              }
            </p>
            <h3 className="mt-2 text-lg font-semibold">
              {geminiQuestions.length > 0 && geminiQuestions[currentGeminiIndex]
                ? geminiQuestions[currentGeminiIndex].prompt
                : currentQuestion.prompt
              }
            </h3>
            {currentQuestion.helperText ? (
              <p className="mt-1 text-sm text-emerald-300">
                {currentQuestion.helperText}
              </p>
            ) : null}
          </div>

          {/* Slider for slider-type questions */}
          {(geminiQuestions.length > 0 && geminiQuestions[currentGeminiIndex]?.kind === "slider"
            ? geminiQuestions[currentGeminiIndex]
            : currentQuestion?.kind === "slider" ? currentQuestion : null) ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <input
                  type="range"
                  min={currentQuestion?.slider?.min ?? 0}
                  max={currentQuestion?.slider?.max ?? 100}
                  step={currentQuestion?.slider?.step ?? 1}
                  value={answers[currentQuestion?.id] ?? currentQuestion?.slider?.min ?? 0}
                  onChange={(e) => currentQuestion && onUpdateAnswer(currentQuestion.id, e.target.value)}
                  className="w-full h-2 bg-emerald-900 rounded-lg appearance-none cursor-pointer accent-lime-300"
                />
              </div>
              {currentQuestion?.slider?.marks && (
                <div className="flex justify-between text-xs text-emerald-400">
                  {currentQuestion.slider.marks.map((mark) => (
                    <span key={mark.value}>{mark.label}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Button options for non-slider questions */
            <div className="grid gap-3">
              {(geminiQuestions.length > 0 && geminiQuestions[currentGeminiIndex]
                ? geminiQuestions[currentGeminiIndex].options
                : currentQuestion.options
              ).map((option) => {
                const currentQ = geminiQuestions.length > 0 ? geminiQuestions[currentGeminiIndex] : currentQuestion;
                const isSelected = answers[currentQ?.id] === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => currentQ && onUpdateAnswer(currentQ.id, option.value)}
                    className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
                      isSelected
                        ? "border-lime-300 bg-lime-300/20"
                        : "border-emerald-800 bg-emerald-900 hover:border-lime-500"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Open Response Box for Base Questions */}
          {geminiQuestions.length === 0 && !currentQuestion?.slider && (
            <div className="mt-4 space-y-2 rounded-lg border border-emerald-800 bg-emerald-900/40 p-3">
              <label htmlFor={`open-response-${currentQuestion?.id}`} className="block text-xs font-semibold uppercase tracking-wide text-emerald-300">
                Write your response here (at least 19 characters)
              </label>
              <textarea
                id={`open-response-${currentQuestion?.id}`}
                value={openResponses[currentQuestion?.id] || ""}
                onChange={(e) => onUpdateOpenResponse(currentQuestion?.id, e.target.value)}
                placeholder="Share any additional context or thoughts about your response..."
                className="w-full rounded-lg border border-emerald-700 bg-emerald-950 px-3 py-2 text-sm text-emerald-100 outline-none ring-lime-300 focus:ring placeholder:text-emerald-600"
                rows={3}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={onHandlePreviousQuestion}
              disabled={
                loading ||
                (geminiQuestions.length > 0
                  ? currentGeminiIndex === 0
                  : currentQuestionIndex === 0)
              }
              className="rounded-lg border border-emerald-800 px-4 py-2 text-sm hover:border-lime-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onHandleNextQuestion}
              disabled={
                loading ||
                (geminiQuestions.length === 0
                  ? currentQuestion?.kind === "slider"
                    ? answers[currentQuestion.id] === undefined
                    : (openResponses[currentQuestion?.id] || "").length < 19
                  : !geminiQuestions[currentGeminiIndex] ||
                    answers[geminiQuestions[currentGeminiIndex].id] === undefined)
              }
              className="rounded-lg bg-lime-300 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Thinking..." : "Next"}
            </button>
            <button
              type="button"
              onClick={onResetToHome}
              className="rounded-lg border border-emerald-800 px-4 py-2 text-sm hover:border-lime-500"
            >
              Restart
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-900 bg-emerald-950/60 p-4 text-sm text-emerald-200">
          <p>No active diagnosis session yet.</p>
          <button
            type="button"
            onClick={onBeginDiagnosis}
            disabled={loading}
            className="mt-3 rounded-lg bg-lime-300 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Starting..." : "Start Diagnosis"}
          </button>
        </div>
      )}
    </div>
  );
}
