"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AdaptiveQuestion,
  DiagnosticAnswers,
  DiagnosisResult,
  InterventionPlan,
  SessionOutcome,
  SessionRecord,
  StudentProfile,
  TrendInsight,
} from "@/model/new/types";

import { AppTab, STORAGE_KEY, MAX_HISTORY, OUTCOME_LABELS } from "./constants";
import {
  asCompleteAnswers,
  formatTimer,
  requestDiagnosis,
} from "./utils";
import {
  generateGeminiQuestions,
  generateInterventionPlans,
} from "./services/diagnosis";
import { useTimer } from "./hooks/useTimer";
import { useHistory } from "./hooks/useHistory";

import { Header } from "./components/Header";
import { Navigation } from "./components/Navigation";
import { Alerts } from "./components/Alerts";
import { HomeTab } from "./components/HomeTab";
import { IntroductionTab } from "./components/IntroductionTab";
import { QuestionnaireTab } from "./components/QuestionnaireTab";
import { ResultTab } from "./components/ResultTab";
import { InterventionTab } from "./components/InterventionTab";
import { InsightsTab } from "./components/InsightsTab";
import { HistoryTab } from "./components/HistoryTab";

export default function StuckApp() {
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [answers, setAnswers] = useState<Partial<DiagnosticAnswers>>({});
  const [openResponses, setOpenResponses] = useState<Record<string, string>>({});
  const [questionQueue, setQuestionQueue] = useState<AdaptiveQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [plan, setPlan] = useState<InterventionPlan | null>(null);
  const [interventionPlans, setInterventionPlans] = useState<string[]>([]);
  const [loadingInterventions, setLoadingInterventions] = useState(false);
  const [showIntroduction, setShowIntroduction] = useState(false);
  const [insights, setInsights] = useState<TrendInsight[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [selectedOutcome, setSelectedOutcome] =
    useState<SessionOutcome>("started");
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [activeTimerStepId, setActiveTimerStepId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [geminiQuestions, setGeminiQuestions] = useState<AdaptiveQuestion[]>([]);
  const [currentGeminiIndex, setCurrentGeminiIndex] = useState(0);
  const [processComplete, setProcessComplete] = useState(false);

  const { history, hydrated, clearHistory: clearHistoryHook, addToHistory } = useHistory();
  const { secondsLeft: timerSecondsLeft, running: timerRunning, start: startTimer, toggle: toggleTimer, reset: resetTimerHook, stop: stopTimer } = useTimer();

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

  function resetResultState(): void {
    setDiagnosis(null);
    setPlan(null);
    setInsights([]);
    setProfile(null);
    setSelectedOutcome("started");
    setCompletedStepIds([]);
    setActiveTimerStepId(null);
    stopTimer();
  }

  function applyDiagnosisResponse(
    response: Extract<import("@/model/new/types").DiagnoseResponse, { status: "diagnosed" }>,
  ): void {
    setDiagnosis(response.diagnosis);
    setPlan(response.plan);
    setInsights(response.insights);
    setProfile(response.profile);
    setSelectedOutcome("started");
    setCompletedStepIds([]);
    setActiveTimerStepId(null);
    stopTimer();
  }

  async function beginDiagnosis(): Promise<void> {
    setErrorMessage("");
    setNotice("");
    setLoading(true);
    setAnswers({});
    setOpenResponses({});
    setQuestionQueue([]);
    setCurrentQuestionIndex(0);
    setGeminiQuestions([]);
    setCurrentGeminiIndex(0);
    setProcessComplete(false);
    resetResultState();

    setShowIntroduction(true);
    setActiveTab("introduction");
    setLoading(false);
  }

  async function startQuestionnaire(): Promise<void> {
    setLoading(true);
    setShowIntroduction(false);
    try {
      const response = await requestDiagnosis({}, history);
      if (response.status === "needs_more_answers") {
        setQuestionQueue(response.questionQueue);
        setCurrentQuestionIndex(0);
        setActiveTab("questionnaire");
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

  function updateOpenResponse(questionId: string, value: string): void {
    setOpenResponses((previous) => ({ ...previous, [questionId]: value }));
  }

  function getLatestDiagnosticAnswers(
    fallback?: Partial<DiagnosticAnswers>,
  ): Partial<DiagnosticAnswers> {
    return {
      internalVoice: (
        fallback?.internalVoice ??
        openResponses.internalVoice ??
        answers.internalVoice ??
        ""
      ).trim(),
      eightyPercentThought: (
        fallback?.eightyPercentThought ??
        openResponses.eightyPercentThought ??
        answers.eightyPercentThought ??
        ""
      ).trim(),
      whyBestWork: (
        fallback?.whyBestWork ??
        openResponses.whyBestWork ??
        answers.whyBestWork ??
        ""
      ).trim(),
      avoidanceDuration: (
        fallback?.avoidanceDuration ??
        openResponses.avoidanceDuration ??
        answers.avoidanceDuration ??
        ""
      ).trim(),
      helpSeeking: (
        fallback?.helpSeeking ??
        openResponses.helpSeeking ??
        answers.helpSeeking ??
        ""
      ).trim(),
    };
  }

  async function handleNextQuestion(): Promise<void> {
    if (!currentQuestion) {
      return;
    }

    const activeQuestion =
      geminiQuestions.length > 0
        ? geminiQuestions[currentGeminiIndex]
        : currentQuestion;

    if (!activeQuestion) {
      return;
    }

    if (geminiQuestions.length === 0) {
      if (activeQuestion.kind === "slider") {
        if (answers[activeQuestion.id] === undefined) {
          setErrorMessage("Please move the slider to continue.");
          return;
        }
      } else {
        const responseText = (openResponses[activeQuestion.id] || "").trim();
        if (responseText.length < 19) {
          setErrorMessage("Please provide at least 19 characters in your response.");
          return;
        }

        setAnswers((previous) => ({
          ...previous,
          [activeQuestion.id]: responseText,
        }));
      }

      const latestDiagnosticAnswers = getLatestDiagnosticAnswers({
        ...answers,
        ...(activeQuestion.kind === "slider"
          ? {}
          : { [activeQuestion.id]: (openResponses[activeQuestion.id] || "").trim() }),
      });

      setErrorMessage("");

      if (currentQuestionIndex < questionQueue.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        return;
      }

      setLoading(true);
      try {
        const generatedQuestions = await generateGeminiQuestions(latestDiagnosticAnswers);
        setGeminiQuestions(generatedQuestions);
        setCurrentGeminiIndex(0);
        setLoading(false);
        return;
      } catch {
        setErrorMessage("Could not generate follow-up questions. Please try again.");
        setLoading(false);
        return;
      }
    } else {
      if (answers[activeQuestion.id] === undefined) {
        setErrorMessage("Select an option to continue.");
        return;
      }
    }

    setErrorMessage("");

    if (currentGeminiIndex < geminiQuestions.length - 1) {
      setCurrentGeminiIndex(currentGeminiIndex + 1);
      return;
    }

    setLoading(true);
    try {
      const latestDiagnosticAnswers = getLatestDiagnosticAnswers();
      const response = await requestDiagnosis(latestDiagnosticAnswers, history);

      if (response.status === "needs_more_answers") {
        setQuestionQueue(response.questionQueue);
        const nextUnansweredIndex = response.questionQueue.findIndex(
          (question) => !latestDiagnosticAnswers[question.id],
        );
        const fallbackIndex = Math.min(
          currentQuestionIndex + 1,
          response.questionQueue.length - 1,
        );
        setCurrentQuestionIndex(
          nextUnansweredIndex === -1 ? fallbackIndex : nextUnansweredIndex,
        );
        setLoading(false);
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
    if (geminiQuestions.length > 0) {
      setCurrentGeminiIndex((previous) => Math.max(0, previous - 1));
      return;
    }
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
    startTimer(minutes);
  }

  async function handleGenerateInterventions(): Promise<void> {
    if (!diagnosis) return;
    
    setLoadingInterventions(true);
    try {
      const plans = await generateInterventionPlans(diagnosis);
      setInterventionPlans(plans);
      setProcessComplete(true);
      setActiveTab("intervention");
    } catch (error) {
      console.error('Error generating intervention plans:', error);
      setErrorMessage("Failed to generate intervention plans. Please try again.");
    } finally {
      setLoadingInterventions(false);
    }
  }

  async function saveSession(): Promise<void> {
    const completeAnswers = asCompleteAnswers(getLatestDiagnosticAnswers());
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
      userId: "anonymous",
      timestamp: now,
      stuckType: diagnosis.primaryType,
      diagnosis,
      interventionPlan: plan,
      outcome: selectedOutcome,
      durationMinutes: 0,
      distortions: [],
      safetyFlags: [],
    };

    try {
      const sessions = [sessionRecord, ...history].slice(0, MAX_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      
      const updatedHistory = addToHistory(sessionRecord);

      const refreshed = await requestDiagnosis(completeAnswers, updatedHistory);
      if (refreshed.status === "diagnosed") {
        setInsights(refreshed.insights);
        setProfile(refreshed.profile);
      }
      setNotice(
        `Session saved as "${OUTCOME_LABELS[selectedOutcome]}".`,
      );
    } catch (error) {
      console.error("Error saving session:", error);
      setErrorMessage("Failed to save session. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function resetToHome(): void {
    setActiveTab("home");
    setAnswers({});
    setOpenResponses({});
    setQuestionQueue([]);
    setCurrentQuestionIndex(0);
    setGeminiQuestions([]);
    setCurrentGeminiIndex(0);
    setShowIntroduction(false);
    setProcessComplete(false);
    resetResultState();
    setErrorMessage("");
    setNotice("");
  }

  async function clearHistory(): Promise<void> {
    try {
      await clearHistoryHook();
      setNotice("History cleared.");
    } catch (error) {
      console.error("Error clearing history:", error);
      setErrorMessage("Failed to clear history. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-emerald-950 text-emerald-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        <Header />

        <Navigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          processComplete={processComplete}
          onClearHistory={clearHistory}
        />

        <Alerts errorMessage={errorMessage} notice={notice} />

        <section className="rounded-2xl border border-emerald-900 bg-emerald-950/70 p-5 md:p-6">
          {activeTab === "home" && (
            <HomeTab loading={loading} onBeginDiagnosis={beginDiagnosis} />
          )}

          {activeTab === "introduction" && (
            <IntroductionTab
              loading={loading}
              onStartQuestionnaire={startQuestionnaire}
              onResetToHome={resetToHome}
            />
          )}

          {activeTab === "questionnaire" && (
            <QuestionnaireTab
              questionQueue={questionQueue}
              currentQuestionIndex={currentQuestionIndex}
              answers={answers}
              openResponses={openResponses}
              geminiQuestions={geminiQuestions}
              currentGeminiIndex={currentGeminiIndex}
              loading={loading}
              answeredCount={answeredCount}
              progressPercent={progressPercent}
              onUpdateAnswer={updateAnswer}
              onUpdateOpenResponse={updateOpenResponse}
              onHandleNextQuestion={handleNextQuestion}
              onHandlePreviousQuestion={handlePreviousQuestion}
              onResetToHome={resetToHome}
              onBeginDiagnosis={beginDiagnosis}
              onSetCurrentQuestionIndex={setCurrentQuestionIndex}
            />
          )}

          {activeTab === "result" && (
            <ResultTab
              diagnosis={diagnosis}
              loadingInterventions={loadingInterventions}
              onGenerateInterventions={handleGenerateInterventions}
              onNavigateToIntervention={() => setActiveTab("intervention")}
            />
          )}

          {activeTab === "intervention" && (
            <InterventionTab
              loadingInterventions={loadingInterventions}
              interventionPlans={interventionPlans}
              saving={saving}
              onSaveSession={saveSession}
              onNavigateToResult={() => setActiveTab("result")}
              onBeginDiagnosis={beginDiagnosis}
            />
          )}

          {activeTab === "insights" && (
            <InsightsTab
              insights={insights}
              profile={profile}
              onNavigateToHistory={() => setActiveTab("history")}
              onNavigateToResult={() => setActiveTab("result")}
              hasDiagnosis={!!diagnosis && !!plan}
            />
          )}

          {activeTab === "history" && (
            <HistoryTab
              history={history}
              onNavigateToInsights={() => setActiveTab("insights")}
            />
          )}
        </section>
      </div>
    </div>
  );
}
