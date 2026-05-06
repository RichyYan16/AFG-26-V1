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
  requestAssessment,
} from "./utils";
import {
  generateFollowUpQuestions,
  generateInterventionPlans,
} from "./services/diagnosis";
import { handleAsyncError, ERROR_MESSAGES } from "./utils/errorHandling";
import { initializeCache, cacheQuestionnaire, getCachedQuestionnaire } from "./utils/cache";
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
import { HistoryTab } from "./components/HistoryTab";

export default function StuckApp() {
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [answers, setAnswers] = useState<Partial<DiagnosticAnswers>>({});
  const [openResponses, setOpenResponses] = useState<Record<string, string>>({});
  const [questionQueue, setQuestionQueue] = useState<AdaptiveQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [assessment, setAssessment] = useState<DiagnosisResult | null>(null);
  const [plan, setPlan] = useState<InterventionPlan | null>(null);
  const [interventionPlans, setInterventionPlans] = useState<Array<{action: string; resources?: string[]}>>([]);
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
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [processComplete, setProcessComplete] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [sessionKey, setSessionKey] = useState<string>("");
  const [noticeTimer, setNoticeTimer] = useState<NodeJS.Timeout | null>(null);

  const { history, hydrated, clearHistory: clearHistoryHook, addToHistory, deleteSession } = useHistory();
  const { secondsLeft: timerSecondsLeft, running: timerRunning, start: startTimer, toggle: toggleTimer, reset: resetTimerHook, stop: stopTimer } = useTimer();

  // Initialize cache on app start
  useEffect(() => {
    initializeCache();
  }, []);

  // Auto-clear notices after 5 seconds
  useEffect(() => {
    if (notice) {
      // Clear any existing timer
      if (noticeTimer) {
        clearTimeout(noticeTimer);
      }
      
      // Set new timer to clear notice after 5 seconds
      const timer = setTimeout(() => {
        setNotice("");
        setNoticeTimer(null);
      }, 5000);
      
      setNoticeTimer(timer);
      
      // Cleanup function
      return () => {
        clearTimeout(timer);
      };
    } else {
      // Clear timer if notice is empty
      if (noticeTimer) {
        clearTimeout(noticeTimer);
        setNoticeTimer(null);
      }
    }
  }, [notice]);

  // Cleanup notice timer on component unmount
  useEffect(() => {
    return () => {
      if (noticeTimer) {
        clearTimeout(noticeTimer);
      }
    };
  }, [noticeTimer]);

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
    setAssessment(null);
    setPlan(null);
    setInsights([]);
    setProfile(null);
    setSelectedOutcome("started");
    setCompletedStepIds([]);
    setActiveTimerStepId(null);
    stopTimer();
    setSessionKey(""); // Reset session key
  }

  // Check if session with this key already exists in history
  function doesSessionExist(sessionKeyToCheck: string): boolean {
    return history.some(session => 
      session.sessionSummary?.sessionKey === sessionKeyToCheck ||
      (session.diagnosis && 
       session.diagnosis.summary && 
       session.diagnosis.summary.includes(sessionKeyToCheck))
    );
  }

  // Generate a unique session signature based on answers
  function generateSessionSignature(answers: Partial<DiagnosticAnswers>): string {
    const answersString = JSON.stringify(answers, Object.keys(answers).sort());
    const timestamp = Date.now().toString();
    return btoa(answersString + timestamp).substring(0, 20);
  }

  function applyAssessmentResponse(
    response: Extract<import("@/model/new/types").DiagnoseResponse, { status: "diagnosed" }>,
  ): void {
    setAssessment(response.diagnosis);
    setPlan(response.plan);
    setInsights(response.insights);
    setProfile(response.profile);
    setSelectedOutcome("started");
    setCompletedStepIds([]);
    setActiveTimerStepId(null);
    stopTimer();
  }

  async function beginAssessment(): Promise<void> {
    setErrorMessage("");
    setRetryCount(0);
    setSessionStartTime(Date.now());
    setLoading(true);
    setAnswers({});
    setOpenResponses({});
    setQuestionQueue([]);
    setCurrentQuestionIndex(0);
    setGeminiQuestions([]);
    setCurrentGeminiIndex(0);
    setProcessComplete(false);
    resetResultState();

    // Generate unique session key based on timestamp and random component
    const timestamp = Date.now();
    const randomComponent = Math.random().toString(36).substring(2, 15);
    const uniqueKey = `${timestamp}_${randomComponent}`;
    setSessionKey(uniqueKey);

    const sessionId = crypto.randomUUID();
    cacheQuestionnaire(sessionId, {}); // Initialize empty questionnaire cache

    setShowIntroduction(true);
    setActiveTab("introduction");
    setLoading(false);
  }

  async function startQuestionnaire(): Promise<void> {
    setLoading(true);
    setShowIntroduction(false);
    try {
      const response = await requestAssessment({}, history);
      if (response.status === "needs_more_answers") {
        setQuestionQueue(response.questionQueue);
        setCurrentQuestionIndex(0);
        setActiveTab("questionnaire");
        return;
      }

      applyAssessmentResponse(response);
      setActiveTab("result");
    } catch (error) {
      const errorMessage = await handleAsyncError(
        () => requestAssessment({}, history),
        { customMessage: ERROR_MESSAGES.assessment.start }
      );
      setErrorMessage(errorMessage.error || ERROR_MESSAGES.assessment.start);
    } finally {
      setLoading(false);
    }
  }

  function updateAnswer(questionId: "internalVoice" | "eightyPercentThought" | "whyBestWork" | "avoidanceDuration" | "helpSeeking", value: string): void {
    setErrorMessage("");
    setAnswers((previous) => {
      const updatedAnswers = { ...previous, [questionId]: value };
      // Cache the updated answers
      const sessionId = 'current_session'; // Use a fixed key for current session
      cacheQuestionnaire(sessionId, updatedAnswers);
      return updatedAnswers;
    });
  }

  function updateOpenResponse(questionId: string, value: string): void {
    setErrorMessage("");
    setOpenResponses((previous) => {
      const updatedResponses = { ...previous, [questionId]: value };
      // Cache the updated responses
      const sessionId = 'current_session';
      const currentAnswers = getLatestDiagnosticAnswers({
        ...answers,
        ...(currentQuestion?.kind === "slider" ? {} : { [currentQuestion.id]: value.trim() }),
      });
      cacheQuestionnaire(sessionId, currentAnswers);
      return updatedResponses;
    });
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
        const generatedQuestions = await generateFollowUpQuestions(latestDiagnosticAnswers);
        setGeminiQuestions(generatedQuestions);
        setCurrentGeminiIndex(0);
        setLoading(false);
        return;
      } catch (error) {
        const result = await handleAsyncError(
          () => generateFollowUpQuestions(latestDiagnosticAnswers),
          { customMessage: ERROR_MESSAGES.assessment.generate }
        );
        
        if (!result.success) {
          setErrorMessage(result.error || ERROR_MESSAGES.assessment.generate);
          setLoading(false);
          return;
        }
        
        // If we got here, the async function succeeded
        const generatedQuestions = result.data!;
        setGeminiQuestions(generatedQuestions);
        setCurrentGeminiIndex(0);
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
      const response = await requestAssessment(latestDiagnosticAnswers, history);

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

      applyAssessmentResponse(response);
      setActiveTab("result");
    } catch (error) {
      const errorMessage = await handleAsyncError(
        () => requestAssessment(getLatestDiagnosticAnswers(), history),
        { customMessage: ERROR_MESSAGES.assessment.process }
      );
      setErrorMessage(errorMessage.error || ERROR_MESSAGES.assessment.process);
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
    if (!assessment) return;
    
    setLoadingInterventions(true);
    try {
      const plans = await generateInterventionPlans(assessment);
      setInterventionPlans(plans);
      setProcessComplete(true);
      setActiveTab("intervention");
    } catch (error) {
      const result = await handleAsyncError(
        () => generateInterventionPlans(assessment),
        { customMessage: ERROR_MESSAGES.intervention.generate }
      );
      
      if (result.success) {
        // If we got here, the async function succeeded
        const plans = result.data!;
        setInterventionPlans(plans);
        setProcessComplete(true);
        setActiveTab("intervention");
      }
    } finally {
      setLoadingInterventions(false);
    }
  }

  async function saveSession(): Promise<void> {
    const completeAnswers = asCompleteAnswers(getLatestDiagnosticAnswers());
    if (!assessment || !plan || !completeAnswers) {
      setErrorMessage("Assessment is incomplete. Finish assessment before saving.");
      return;
    }

    // Generate session signature based on answers
    const sessionSignature = generateSessionSignature(completeAnswers);
    
    // Check if this session already exists
    if (doesSessionExist(sessionKey) || doesSessionExist(sessionSignature)) {
      setNotice("This session has already been saved.");
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
      id: crypto.randomUUID(),
      userId: "user", // TODO: Get actual user ID
      timestamp: now,
      stuckType: assessment.primaryType,
      diagnosis: {
        ...assessment,
        summary: `${assessment.summary} [SessionKey: ${sessionKey}]` // Embed session key in summary
      },
      interventionPlan: plan,
      outcome: selectedOutcome,
      durationMinutes: Math.floor((Date.now() - sessionStartTime) / 60000),
      distortions: [], // TODO: Calculate distortions
      safetyFlags: [], // TODO: Check for safety flags
      sessionSummary: {
        stuckType: assessment.primaryType,
        confidence: assessment.confidence,
        primaryPlanHeadline: `${plan.headline} - ${plan.whyItWorks}`,
        estimatedTimeMinutes: plan.estimatedTotalMinutes,
        sessionKey: sessionKey
      }
    };

    const updatedHistory = [...history, sessionRecord];
    await addToHistory(sessionRecord);

    try {
      const response = await requestAssessment(completeAnswers, history);
      if (response.status === "diagnosed") {
        setInsights(response.insights);
        setProfile(response.profile);
      }
      setNotice(
        `Session saved as "${OUTCOME_LABELS[selectedOutcome]}".`,
      );
    } catch (error) {
      const errorMessage = await handleAsyncError(
        () => requestAssessment(completeAnswers, updatedHistory),
        { customMessage: ERROR_MESSAGES.session.save }
      );
      setErrorMessage(errorMessage.error || ERROR_MESSAGES.session.save);
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
    setSessionKey(""); // Clear session key
    setErrorMessage("");
    setNotice("");
    // Clear notice timer
    if (noticeTimer) {
      clearTimeout(noticeTimer);
      setNoticeTimer(null);
    }
  }

  async function clearHistory(): Promise<void> {
    try {
      await clearHistoryHook();
      setNotice("History cleared.");
    } catch (error) {
      const errorMessage = await handleAsyncError(
        () => clearHistoryHook(),
        { customMessage: "Failed to clear history. Please try again." }
      );
      setErrorMessage(errorMessage.error || "Failed to clear history. Please try again.");
    }
  }

  async function deleteSessionById(sessionId: string): Promise<void> {
    try {
      deleteSession(sessionId);
      setNotice("Session deleted.");
    } catch (error) {
      setErrorMessage("Failed to delete session. Please try again.");
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
        />

        <Alerts errorMessage={errorMessage} notice={notice} />

        <section className="rounded-2xl border border-emerald-900 bg-emerald-950/70 p-5 md:p-6">
          {activeTab === "home" && (
            <HomeTab loading={loading} onBeginDiagnosis={beginAssessment} />
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
              onBeginDiagnosis={beginAssessment}
            />
          )}

          {activeTab === "result" && (
            <ResultTab
              diagnosis={assessment}
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
              onBeginDiagnosis={beginAssessment}
            />
          )}

          {activeTab === "history" && (
            <HistoryTab
              history={history}
              onNavigateToInsights={() => setActiveTab("insights")}
              onClearHistory={clearHistory}
              onDeleteSession={deleteSessionById}
            />
          )}
        </section>
      </div>
    </div>
  );
}
