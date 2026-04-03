"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import SideChatbot from "@/app/components/SideChatbot";
import type {
  AdaptiveQuestion,
  DiagnoseResponse,
  DiagnosticAnswers,
  DiagnosticContext,
  DiagnosisResult,
  InterventionPlan,
  SessionOutcome,
  SessionRecord,
  StuckType,
  StudentProfile,
  TrendInsight,
} from "@/model/new/types";

type AppTab =
  | "home"
  | "diagnosis"
  | "result"
  | "insights"
  | "history";

const STORAGE_KEY = "stuck_sessions_v1";
const MAX_HISTORY = 300;

const QUESTION_TITLES: Record<AdaptiveQuestion["id"], string> = {
  internalVoice: "Internal Voice",
  eightyPercentThought: "80% Thought",
  whyBestWork: "Why Best Work",
  avoidanceDuration: "Avoidance Duration",
  helpSeeking: "Asking for Help",
};

const STUCK_TYPE_LABELS: Record<StuckType, string> = {
  confusion: "Confusion Stuck",
  ambiguity: "Ambiguity Stuck",
  fear: "Fear Stuck",
  overwhelm: "Overwhelm Stuck",
  exhaustion: "Exhaustion Stuck",
  perfection_loop: "Perfection Loop Stuck",
};

const OUTCOME_LABELS: Record<SessionOutcome, string> = {
  started: "Started",
  finished: "Finished",
  gave_up: "Gave Up",
};

const TAB_LABELS: Record<AppTab, string> = {
  home: "Home",
  diagnosis: "Diagnosis",
  result: "Plan",
  insights: "Insights",
  history: "History",
};

const DEFAULT_CONTEXT: DiagnosticContext = {
  subject: "",
  assignmentType: "Homework",
  timeStuckMinutes: 30,
};

function asCompleteAnswers(
  answers: Partial<DiagnosticAnswers>,
): DiagnosticAnswers | null {
  if (
    answers.internalVoice &&
    answers.eightyPercentThought &&
    answers.whyBestWork &&
    answers.avoidanceDuration &&
    answers.helpSeeking
  ) {
    return answers as DiagnosticAnswers;
  }

  return null;
}

function formatTimer(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function loadStoredHistory(): SessionRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as SessionRecord[];
  } catch {
    return [];
  }
}

async function requestDiagnosis(
  answers: Partial<DiagnosticAnswers>,
  context: DiagnosticContext,
  history: SessionRecord[],
): Promise<DiagnoseResponse> {
  const response = await fetch("/api/stuck/diagnose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers, context, history }),
  });

  if (!response.ok) {
    throw new Error("Diagnosis request failed.");
  }

  return (await response.json()) as DiagnoseResponse;
}

export default function StuckApp() {
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [answers, setAnswers] = useState<Partial<DiagnosticAnswers>>({});
  const [questionQueue, setQuestionQueue] = useState<AdaptiveQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [context, setContext] = useState(DEFAULT_CONTEXT);
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [plan, setPlan] = useState<InterventionPlan | null>(null);
  const [insights, setInsights] = useState<TrendInsight[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [selectedOutcome, setSelectedOutcome] =
    useState<SessionOutcome>("started");
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [activeTimerStepId, setActiveTimerStepId] = useState<string | null>(
    null,
  );
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [historyHydrated, setHistoryHydrated] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const currentQuestion = questionQueue[currentQuestionIndex] ?? null;

  const answeredCount = useMemo(
    () => questionQueue.filter((question) => answers[question.id] !== undefined).length,
    [answers, questionQueue],
  );

  const progressPercent = useMemo(() => {
    if (questionQueue.length === 0) {
      return 0;
    }
    return Math.round((answeredCount / questionQueue.length) * 100);
  }, [answeredCount, questionQueue.length]);

  const activeStep = useMemo(
    () => {
      if (!plan || activeTimerStepId === null) return null;
      const stepIndex = parseInt(activeTimerStepId, 10);
      return plan.steps[stepIndex] ?? null;
    },
    [activeTimerStepId, plan],
  );

  useEffect(() => {
    const storedHistory = loadStoredHistory();
    setHistory(storedHistory);
    setHistoryHydrated(true);
  }, []);

  useEffect(() => {
    if (!historyHydrated || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history, historyHydrated]);

  useEffect(() => {
    if (!timerRunning) {
      return;
    }

    const timerId = window.setInterval(() => {
      setTimerSecondsLeft((previous) => {
        if (previous <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [timerRunning]);

  function resetResultState(): void {
    setDiagnosis(null);
    setPlan(null);
    setInsights([]);
    setProfile(null);
    setSelectedOutcome("started");
    setCompletedStepIds([]);
    setActiveTimerStepId(null);
    setTimerSecondsLeft(0);
    setTimerRunning(false);
  }

  function applyDiagnosisResponse(
    response: Extract<DiagnoseResponse, { status: "diagnosed" }>,
  ): void {
    setDiagnosis(response.diagnosis);
    setPlan(response.plan);
    setInsights(response.insights);
    setProfile(response.profile);
    setSelectedOutcome("started");
    setCompletedStepIds([]);
    setActiveTimerStepId(null);
    setTimerSecondsLeft(0);
    setTimerRunning(false);
  }

  async function beginDiagnosis(): Promise<void> {
    setErrorMessage("");
    setNotice("");
    setLoading(true);
    setAnswers({});
    setQuestionQueue([]);
    setCurrentQuestionIndex(0);
    resetResultState();

    try {
      const response = await requestDiagnosis({}, context, history);
      if (response.status === "needs_more_answers") {
        setQuestionQueue(response.questionQueue);
        setCurrentQuestionIndex(0);
        setActiveTab("diagnosis");
        return;
      }

      applyDiagnosisResponse(response);
      setActiveTab("result");
    } catch {
      setErrorMessage("Could not start diagnosis. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function updateAnswer(questionId: AdaptiveQuestion["id"], value: string): void {
    setErrorMessage("");
    setAnswers((previous) => ({ ...previous, [questionId]: value }));
  }

  async function handleNextQuestion(): Promise<void> {
    if (!currentQuestion) {
      return;
    }

    if (answers[currentQuestion.id] === undefined) {
      setErrorMessage("Select an option to continue.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await requestDiagnosis(answers, context, history);

      if (response.status === "needs_more_answers") {
        setQuestionQueue(response.questionQueue);
        const nextUnansweredIndex = response.questionQueue.findIndex(
          (question) => answers[question.id] === undefined,
        );
        const fallbackIndex = Math.min(
          currentQuestionIndex + 1,
          response.questionQueue.length - 1,
        );
        setCurrentQuestionIndex(
          nextUnansweredIndex === -1 ? fallbackIndex : nextUnansweredIndex,
        );
        return;
      }

      applyDiagnosisResponse(response);
      setActiveTab("result");
    } catch {
      setErrorMessage("Could not process this answer. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handlePreviousQuestion(): void {
    setErrorMessage("");
    setCurrentQuestionIndex((previous) => Math.max(0, previous - 1));
  }

  function toggleStepComplete(stepId: string): void {
    setCompletedStepIds((previous) =>
      previous.includes(stepId)
        ? previous.filter((id) => id !== stepId)
        : [...previous, stepId],
    );
  }

  function startStepTimer(stepId: string, minutes: number): void {
    setActiveTimerStepId(stepId);
    setTimerSecondsLeft(minutes * 60);
    setTimerRunning(true);
  }

  function toggleTimerRunning(): void {
    if (!activeStep) {
      return;
    }
    setTimerRunning((previous) => !previous);
  }

  function resetTimer(): void {
    if (!activeStep) {
      setActiveTimerStepId(null);
      setTimerSecondsLeft(0);
      setTimerRunning(false);
      return;
    }

    setTimerSecondsLeft(activeStep.timeMinutes * 60);
    setTimerRunning(false);
  }

  async function saveSession(): Promise<void> {
    const completeAnswers = asCompleteAnswers(answers);
    if (!diagnosis || !plan || !completeAnswers) {
      setErrorMessage("Diagnosis is incomplete. Finish diagnosis before saving.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setNotice("");

    const now = new Date().toISOString();
    const interventionUsed =
      completedStepIds.length > 0
        ? completedStepIds.join(",")
        : `${plan.stuckType}:initial`;

    const sessionRecord: SessionRecord = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `session-${Date.now()}`,
      userId: "local-user",
      timestamp: now,
      stuckType: diagnosis.primaryType,
      diagnosis,
      interventionPlan: plan,
      outcome: selectedOutcome,
      durationMinutes: context?.timeStuckMinutes || 0,
      distortions: [],
      safetyFlags: [],
    };

    const updatedHistory = [sessionRecord, ...history].slice(0, MAX_HISTORY);
    setHistory(updatedHistory);

    try {
      const refreshed = await requestDiagnosis(completeAnswers, context, updatedHistory);
      if (refreshed.status === "diagnosed") {
        setInsights(refreshed.insights);
        setProfile(refreshed.profile);
      }
      setNotice(
        `Session saved as "${OUTCOME_LABELS[selectedOutcome]}". History entries: ${updatedHistory.length}.`,
      );
    } catch {
      setErrorMessage("Session saved locally, but insight refresh failed.");
    } finally {
      setSaving(false);
    }
  }

  function resetToHome(): void {
    setActiveTab("home");
    setAnswers({});
    setQuestionQueue([]);
    setCurrentQuestionIndex(0);
    resetResultState();
    setErrorMessage("");
    setNotice("");
  }

  function clearHistory(): void {
    setHistory([]);
    setNotice("History cleared.");
  }

  const recentHistory = history.slice(0, 6);
  const diagnosisLabel = diagnosis
    ? STUCK_TYPE_LABELS[diagnosis.primaryType]
    : null;
  const firstAction = plan?.steps?.[0]?.action ?? null;

  return (
    <div className="min-h-screen bg-emerald-950 text-emerald-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        <header className="rounded-2xl border border-emerald-900 bg-emerald-950/70 p-4 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/images/stuck-logo.png"
                alt="Unstuck logo"
                width={126}
                height={102}
                className="h-16 w-auto rounded-xl border border-emerald-800 bg-white p-1"
              />
              <div>
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  Unstuck
                </h1>
                <p className="text-sm text-emerald-200 md:text-base">
                  App for academic paralysis. 
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="rounded-2xl border border-emerald-900 bg-emerald-950/70 p-4">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TAB_LABELS) as AppTab[]).map((tabKey) => {
              const disabled =
                tabKey === "result" && (diagnosis === null || plan === null);
              const selected = activeTab === tabKey;

              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setActiveTab(tabKey)}
                  disabled={disabled}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    selected
                      ? "border-lime-300 bg-lime-300/20"
                      : "border-emerald-800 hover:border-lime-500"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {TAB_LABELS[tabKey]}
                </button>
              );
            })}

            <button
              type="button"
              onClick={clearHistory}
              className="rounded-lg border border-rose-700 px-3 py-2 text-sm text-rose-200 hover:border-rose-500"
            >
              Clear History
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-rose-700 bg-rose-950/60 px-4 py-3 text-sm text-rose-200">
            {errorMessage}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-xl border border-emerald-700 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-200">
            {notice}
          </div>
        ) : null}

        <section className="rounded-2xl border border-emerald-900 bg-emerald-950/70 p-5 md:p-6">
          {activeTab === "home" ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="text-xl font-semibold">Start When You Freeze</h2>
                <p className="max-w-3xl text-sm text-emerald-200 md:text-base">
                  The UI is now organized into tabs. Set details in{" "}
                  <strong>Context</strong>, answer the adaptive questions in{" "}
                  <strong>Diagnosis</strong>, then follow your intervention in{" "}
                  <strong>Plan</strong>.
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
                  onClick={beginDiagnosis}
                  disabled={loading}
                  className="rounded-xl bg-lime-300 px-6 py-3 text-sm font-semibold text-emerald-950 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Starting..." : "I'M STUCK"}
                </button>
              </div>
            </div>
          ) : null}

          {activeTab === "diagnosis" ? (
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
                      Question {currentQuestionIndex + 1} of {questionQueue.length}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold">
                      {currentQuestion.prompt}
                    </h3>
                    {currentQuestion.helperText ? (
                      <p className="mt-1 text-sm text-emerald-300">
                        {currentQuestion.helperText}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-3">
                    {/* Open-response text questions */}
                    {["internalVoice", "eightyPercentThought", "whyBestWork", "avoidanceDuration", "helpSeeking"].includes(currentQuestion.id) ? (
                      <textarea
                        value={(answers[currentQuestion.id] as string) || ""}
                        onChange={(e) =>
                          updateAnswer(currentQuestion.id, e.target.value)
                        }
                        placeholder="Type your response here..."
                        className="rounded-lg border border-emerald-800 bg-emerald-900 px-4 py-3 text-sm text-emerald-100 placeholder-emerald-500 focus:border-lime-500 focus:outline-none"
                        rows={4}
                      />
                    ) : (
                      /* Multiple choice questions */
                      currentQuestion.options?.map((option: any) => {
                        const isSelected = answers[currentQuestion.id] === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              updateAnswer(currentQuestion.id, option.value)
                            }
                            className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
                              isSelected
                                ? "border-lime-300 bg-lime-300/20"
                                : "border-emerald-800 bg-emerald-900 hover:border-lime-500"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handlePreviousQuestion}
                      disabled={currentQuestionIndex === 0 || loading}
                      className="rounded-lg border border-emerald-800 px-4 py-2 text-sm hover:border-lime-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      disabled={loading}
                      className="rounded-lg bg-lime-300 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? "Thinking..." : "Next"}
                    </button>
                    <button
                      type="button"
                      onClick={resetToHome}
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
                    onClick={beginDiagnosis}
                    disabled={loading}
                    className="mt-3 rounded-lg bg-lime-300 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Starting..." : "Start Diagnosis"}
                  </button>
                </div>
              )}

              <div className="grid gap-2 rounded-xl border border-emerald-900 bg-emerald-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-300">
                  Question Navigator
                </p>
                <div className="flex flex-wrap gap-2">
                  {questionQueue.map((question, index) => {
                    const answered = answers[question.id] !== undefined;
                    const selected = index === currentQuestionIndex;

                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={`rounded-md border px-3 py-1.5 text-xs ${
                          selected
                            ? "border-lime-300 bg-lime-300/20"
                            : answered
                              ? "border-lime-500 bg-lime-900/20"
                              : "border-emerald-800 hover:border-lime-500"
                        }`}
                      >
                        {index + 1}. {QUESTION_TITLES[question.id]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "result" ? (
            <div className="space-y-5">
              {diagnosis && plan ? (
                <>
                  <div className="rounded-xl border border-lime-600/50 bg-lime-950/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-lime-200">
                      Diagnosis
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold">
                      {STUCK_TYPE_LABELS[diagnosis.primaryType]}
                    </h2>
                    <p className="mt-1 text-sm text-emerald-200">
                      Confidence: {Math.round(diagnosis.confidence * 100)}%
                    </p>
                    <p className="mt-3 text-sm text-emerald-100">
                      {diagnosis.summary}
                    </p>
                  </div>

                  <div className="grid gap-3 rounded-xl border border-emerald-900 bg-emerald-950/60 p-4">
                    <h3 className="text-sm font-semibold text-emerald-100">
                      Ranked Types
                    </h3>
                    {diagnosis.rankedTypes.map((item) => (
                      <div key={item.type} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span>{STUCK_TYPE_LABELS[item.type]}</span>
                          <span>{Math.round(item.normalized * 100)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-emerald-900">
                          <div
                            className="h-full rounded-full bg-lime-300"
                            style={{ width: `${Math.round(item.normalized * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-emerald-900 bg-emerald-950/60 p-4">
                    <h3 className="text-lg font-semibold">{plan.headline}</h3>
                    <p className="mt-2 text-sm text-emerald-200">{plan.whyItWorks}</p>
                  </div>

                  <div className="space-y-3 rounded-xl border border-emerald-900 bg-emerald-950/60 p-4">
                    <h3 className="text-sm font-semibold text-emerald-100">
                      Intervention Steps
                    </h3>

                    {plan.steps.map((step, index) => {
                      const completed = completedStepIds.includes(`${index}`);
                      const timerActive = activeTimerStepId === `${index}`;

                      return (
                        <div
                          key={`step-${index}`}
                          className={`rounded-lg border p-3 ${
                            completed
                              ? "border-lime-500 bg-lime-900/20"
                              : "border-emerald-800"
                          }`}
                        >
                          <p className="text-xs text-emerald-300">
                            Step {index + 1} - {step.timeMinutes} min
                          </p>
                          <p className="mt-1 text-sm">{step.action}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => toggleStepComplete(`${index}`)}
                              className="rounded-md border border-emerald-700 px-3 py-1.5 text-xs hover:border-emerald-500"
                            >
                              {completed ? "Undo Complete" : "Mark Complete"}
                            </button>
                            <button
                              type="button"
                              onClick={() => startStepTimer(`${index}`, step.timeMinutes)}
                              className="rounded-md border border-lime-400 px-3 py-1.5 text-xs text-lime-100 hover:border-lime-300"
                            >
                              {timerActive ? "Restart Timer" : "Start Timer"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-xl border border-emerald-900 bg-emerald-950/60 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-emerald-100">Timer</p>
                      {activeStep ? (
                        <span className="rounded-md border border-emerald-800 px-2 py-1 text-xs text-emerald-200">
                          Active: {activeStep.timeMinutes} min step
                        </span>
                      ) : (
                        <span className="rounded-md border border-emerald-800 px-2 py-1 text-xs text-emerald-200">
                          No active step
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-3xl font-semibold">
                      {formatTimer(timerSecondsLeft)}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={toggleTimerRunning}
                        disabled={!activeStep}
                        className="rounded-md border border-emerald-700 px-3 py-1.5 text-xs hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {timerRunning ? "Pause" : "Resume"}
                      </button>
                      <button
                        type="button"
                        onClick={resetTimer}
                        className="rounded-md border border-emerald-700 px-3 py-1.5 text-xs hover:border-emerald-500"
                      >
                        Reset Timer
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-xl border border-emerald-900 bg-emerald-950/60 p-4">
                    <h3 className="text-sm font-semibold text-emerald-100">Outcome</h3>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(OUTCOME_LABELS) as SessionOutcome[]).map(
                        (outcome) => (
                          <button
                            key={outcome}
                            type="button"
                            onClick={() => setSelectedOutcome(outcome)}
                            className={`rounded-md border px-3 py-1.5 text-xs ${
                              selectedOutcome === outcome
                                ? "border-lime-300 bg-lime-300/20"
                                : "border-emerald-800 hover:border-lime-500"
                            }`}
                          >
                            {OUTCOME_LABELS[outcome]}
                          </button>
                        ),
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={saveSession}
                        disabled={saving}
                        className="rounded-lg bg-lime-300 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saving ? "Saving..." : "Save Session"}
                      </button>
                      <button
                        type="button"
                        onClick={beginDiagnosis}
                        disabled={loading}
                        className="rounded-lg border border-emerald-800 px-4 py-2 text-sm hover:border-lime-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        New Diagnosis
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("insights")}
                        className="rounded-lg border border-emerald-800 px-4 py-2 text-sm hover:border-lime-500"
                      >
                        View Insights Tab
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-emerald-900 bg-emerald-950/60 p-4 text-sm text-emerald-200">
                  No diagnosis found. Open the Diagnosis tab and run the questionnaire.
                </div>
              )}
            </div>
          ) : null}

          {activeTab === "insights" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-900 bg-emerald-950/70 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
                  Insights
                </h3>
                {insights.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {insights.map((insight, index) => (
                      <div
                        key={`insight-${index}`}
                        className="rounded-lg border border-emerald-800 bg-emerald-950/60 p-3"
                      >
                        <p className="text-xs text-emerald-300">
                          {insight.type} (Severity: {insight.severity})
                        </p>
                        <p className="mt-1 text-sm">{insight.description}</p>
                        <p className="mt-1 text-xs text-emerald-400">→ {insight.recommendation}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-emerald-300">
                    Save sessions to generate behavioral insights.
                  </p>
                )}

                {profile ? (
                  <div className="mt-4 rounded-lg border border-emerald-800 bg-emerald-950/60 p-3">
                    <p className="text-xs text-emerald-300">Profile Summary</p>
                    <p className="mt-1 text-sm">Sessions: {profile.totalSessions}</p>
                    <p className="text-sm">
                      Avg stuck time: {Math.round(profile.averageTimeStuckMinutes)} min
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className="rounded-lg border border-emerald-800 px-4 py-2 text-sm hover:border-lime-500"
                >
                  Open History Tab
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("result")}
                  disabled={!diagnosis || !plan}
                  className="rounded-lg border border-emerald-800 px-4 py-2 text-sm hover:border-lime-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Back To Plan Tab
                </button>
              </div>
            </div>
          ) : null}

          {activeTab === "history" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-900 bg-emerald-950/70 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
                  Recent Sessions
                </h3>

                {recentHistory.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {recentHistory.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => {
                          setNotice(`Reviewing ${STUCK_TYPE_LABELS[session.stuckType]} session.`);
                        }}
                        className="w-full rounded-lg border border-emerald-800 bg-emerald-950/60 p-3 text-left hover:border-lime-500"
                      >
                        <p className="text-sm">
                          {STUCK_TYPE_LABELS[session.stuckType]} -{" "}
                          {OUTCOME_LABELS[session.outcome]}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-emerald-300">
                    No saved sessions yet.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("insights")}
                  className="rounded-lg border border-emerald-800 px-4 py-2 text-sm hover:border-lime-500"
                >
                  Open Insights Tab
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <SideChatbot
        isOpen={chatOpen}
        onOpen={() => setChatOpen(true)}
        onClose={() => setChatOpen(false)}
        subject={context.subject ?? ""}
        assignmentType={context.assignmentType ?? ""}
        diagnosisLabel={diagnosisLabel}
        firstAction={firstAction}
        onOpenDiagnosisTab={() => setActiveTab("diagnosis")}
        onOpenPlanTab={() => setActiveTab("result")}
      />
    </div>
  );
}
