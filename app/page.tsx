"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import SideChatbot from "@/app/components/SideChatbot";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthForm from "@/components/AuthForm";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User } from "lucide-react";
import { getUserSessions, saveUserSession, clearUserSessions } from "@/services/firebaseService";
import { sendMessageToAPI, type ChatMessage } from "@/app/services/api";
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
} from "@/model";

type AppTab =
  | "home"
  | "introduction"
  | "context"
  | "questionnaire"
  | "result"
  | "intervention"
  | "insights"
  | "history";

const STORAGE_KEY = "stuck_sessions_v1";
const MAX_HISTORY = 300;

const QUESTION_TITLES: Record<AdaptiveQuestion["id"], string> = {
  understandsQuestion: "Understanding",
  canSubmitBadInFiveMinutes: "Rough Submission",
  strongestEmotion: "Emotion",
  taskScope: "Task Scope",
  gradeWorry: "Grade Worry",
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
  introduction: "Introduction",
  context: "Context",
  questionnaire: "Questionnaire",
  result: "Result",
  intervention: "Plan",
  insights: "Insights",
  history: "History",
};

const DEFAULT_CONTEXT: Required<
  Pick<
    DiagnosticContext,
    | "subject"
    | "assignmentType"
    | "timeStuckMinutes"
    | "tasksOpenCount"
    | "energyLevel"
    | "panicLevel"
    | "repeatedRereading"
    | "excessiveEditing"
  >
> = {
  subject: "",
  assignmentType: "Homework",
  timeStuckMinutes: 30,
  tasksOpenCount: 1,
  energyLevel: 3,
  panicLevel: 3,
  repeatedRereading: false,
  excessiveEditing: false,
};

function asCompleteAnswers(
  answers: Partial<DiagnosticAnswers>,
): DiagnosticAnswers | null {
  if (
    answers.understandsQuestion &&
    answers.canSubmitBadInFiveMinutes &&
    answers.strongestEmotion &&
    answers.taskScope &&
    answers.gradeWorry
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

async function loadUserHistory(userId: string): Promise<SessionRecord[]> {
  if (!userId) {
    return [];
  }

  try {
    return await getUserSessions(userId, MAX_HISTORY);
  } catch (error) {
    console.error("Error loading user history:", error);
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
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [answers, setAnswers] = useState<Partial<DiagnosticAnswers>>({});
  const [questionQueue, setQuestionQueue] = useState<AdaptiveQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [context, setContext] = useState(DEFAULT_CONTEXT);
  const [history, setHistory] = useState<SessionRecord[]>([]);
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
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [historyHydrated, setHistoryHydrated] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [geminiQuestions, setGeminiQuestions] = useState<AdaptiveQuestion[]>([]);
  const [currentGeminiIndex, setCurrentGeminiIndex] = useState(0);
  const [wordEmbeddingResults, setWordEmbeddingResults] = useState<Record<string, number>>({});
  const [processComplete, setProcessComplete] = useState(false);

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
    () => plan?.steps.find((step) => step.id === activeTimerStepId) ?? null,
    [activeTimerStepId, plan],
  );

  useEffect(() => {
    if (user) {
      loadUserHistory(user.uid).then((userHistory) => {
        setHistory(userHistory);
        setHistoryHydrated(true);
      });
    } else {
      // Set history as empty for non-authenticated users
      setHistory([]);
      setHistoryHydrated(true);
    }
  }, [user]);

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
    setGeminiQuestions([]);
    setCurrentGeminiIndex(0);
    setWordEmbeddingResults({});
    setProcessComplete(false); // Reset process completion
    resetResultState();

    // Show introduction screen first
    setShowIntroduction(true);
    setActiveTab("introduction");
    setLoading(false);
  }

  async function startQuestionnaire(): Promise<void> {
    setLoading(true);
    setShowIntroduction(false); // Mark introduction as completed
    try {
      const response = await requestDiagnosis({}, context, history);
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

  // Custom Word Embedding Algorithm
  function computeWordEmbeddings(answers: Partial<DiagnosticAnswers>): Record<string, number> {
    const embeddings: Record<string, number> = {};
    
    // Simple word embedding based on response patterns
    if (answers.understandsQuestion === "no") embeddings.confusion = 0.8;
    if (answers.understandsQuestion === "partly") embeddings.ambiguity = 0.6;
    if (answers.canSubmitBadInFiveMinutes === "no") embeddings.perfection_loop = 0.7;
    if (answers.canSubmitBadInFiveMinutes === "maybe") embeddings.fear = 0.5;
    if (answers.strongestEmotion === "scared") embeddings.fear = 0.9;
    if (answers.strongestEmotion === "overwhelmed") embeddings.overwhelm = 0.8;
    if (answers.strongestEmotion === "numb") embeddings.exhaustion = 0.7;
    if (answers.taskScope === "unclear") embeddings.ambiguity = 0.8;
    if (answers.gradeWorry === "high") embeddings.fear = 0.8;
    if (answers.gradeWorry === "medium") embeddings.perfection_loop = 0.6;
    
    return embeddings;
  }

  // Generate Gemini questions based on initial responses
  async function generateGeminiQuestions(answers: Partial<DiagnosticAnswers>): Promise<AdaptiveQuestion[]> {
    try {
      const embeddings = computeWordEmbeddings(answers);
      setWordEmbeddingResults(embeddings);
      
      const topStuckType = Object.entries(embeddings).reduce((a, b) => 
        embeddings[a[0]] > embeddings[b[0]] ? a : b
      )[0];
      
      // Use Gemini API to generate follow-up questions
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `You are an educational psychologist helping diagnose academic paralysis. Based on student's initial responses indicating ${topStuckType} tendencies, generate 5 follow-up questions to better understand their situation. Each question should have 3-4 answer options. Return as JSON array with format: [{id: "q1", prompt: "question", options: [{value: "a", label: "Option A"}]}]`
        },
        {
          role: 'user',
          content: `Student responses: ${JSON.stringify(answers)}. Generate 5 follow-up questions.`
        }
      ];
      
      const response = await sendMessageToAPI(messages);
      
      // Clean up the response - remove markdown formatting if present
      let cleanResponse = response;
      if (response.includes('```json')) {
        cleanResponse = response.replace(/```json\n?/g, '').replace(/```$/g, '');
      }
      
      // Try to parse JSON, fallback to empty array if fails
      let generatedQuestions;
      try {
        generatedQuestions = JSON.parse(cleanResponse);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw response:', response);
        console.error('Cleaned response:', cleanResponse);
        generatedQuestions = [];
      }
      
      // Validate the parsed data
      if (!Array.isArray(generatedQuestions)) {
        console.error('Response is not an array:', generatedQuestions);
        return [];
      }
      
      return generatedQuestions.map((q: any, index: number) => ({
        id: `gemini_${index + 1}` as any,
        prompt: q.prompt || `Follow-up question ${index + 1}`,
        options: Array.isArray(q.options) ? q.options : [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "maybe", label: "Sometimes" }
        ]
      }));
    } catch (error) {
      console.error('Error generating Gemini questions:', error);
      return [];
    }
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
      // Check if we've completed the base 5 questions
      const baseQuestionsCompleted = Object.keys(answers).length >= 5 && geminiQuestions.length === 0;
      
      if (baseQuestionsCompleted) {
        // Generate Gemini questions based on initial responses
        const generatedQuestions = await generateGeminiQuestions(answers);
        setGeminiQuestions(generatedQuestions);
        setCurrentGeminiIndex(0);
        
        if (generatedQuestions.length > 0) {
          // Show the first Gemini question
          setLoading(false);
          return;
        }
      }
      
      // Check if we're currently on Gemini questions
      if (geminiQuestions.length > 0 && currentGeminiIndex < geminiQuestions.length) {
        // Move to next Gemini question or finish
        if (currentGeminiIndex < geminiQuestions.length - 1) {
          setCurrentGeminiIndex(currentGeminiIndex + 1);
          setLoading(false);
          return;
        }
      }
      
      // Final diagnosis with all answers
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

    setTimerSecondsLeft(activeStep.minutes * 60);
    setTimerRunning(false);
  }

  // Generate intervention plans using Gemini API
  async function generateInterventionPlans(diagnosis: DiagnosisResult): Promise<string[]> {
    setLoadingInterventions(true);
    try {
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `You are an educational psychologist specializing in academic paralysis. Based on the diagnosis of ${diagnosis.primaryType} with ${Math.round(diagnosis.confidence * 100)}% confidence, generate 5 specific, actionable intervention strategies. Each should be concise (1-2 sentences) and practical for students. Return as a JSON array of strings.`
        },
        {
          role: 'user',
          content: `Diagnosis results: ${JSON.stringify(diagnosis)}. Generate 5 intervention plans.`
        }
      ];
      
      const response = await sendMessageToAPI(messages);
      
      // Clean up the response - remove markdown formatting if present
      let cleanResponse = response;
      if (response.includes('```json')) {
        cleanResponse = response.replace(/```json\n?/g, '').replace(/```$/g, '');
      }
      
      const plans = JSON.parse(cleanResponse);
      const finalPlans = Array.isArray(plans) ? plans : [];
      
      // Set the intervention plans state
      setInterventionPlans(finalPlans);
      
      // Mark process as complete
      setProcessComplete(true);
      
      return finalPlans;
    } catch (error) {
      console.error('Error generating intervention plans:', error);
      setInterventionPlans([]);
      return [];
    } finally {
      setLoadingInterventions(false);
    }
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
      userId: user?.uid || "anonymous",
      createdAt: now,
      subject: context.subject.trim() || "Unknown Subject",
      assignmentType: context.assignmentType.trim() || "Unknown Assignment",
      stuckType: diagnosis.primaryType,
      emotion: completeAnswers.strongestEmotion,
      timeStuckMinutes: context.timeStuckMinutes,
      interventionUsed,
      outcome: selectedOutcome,
    };

    try {
      if (user) {
        await saveUserSession(user.uid, sessionRecord);
      }
      
      const updatedHistory = [sessionRecord, ...history].slice(0, MAX_HISTORY);
      setHistory(updatedHistory);

      const refreshed = await requestDiagnosis(completeAnswers, context, updatedHistory);
      if (refreshed.status === "diagnosed") {
        setInsights(refreshed.insights);
        setProfile(refreshed.profile);
      }
      setNotice(
        `Session saved as "${OUTCOME_LABELS[selectedOutcome]}". ${user ? 'Saved to your account.' : 'Sign in to save your sessions permanently.'}`,
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
    setQuestionQueue([]);
    setCurrentQuestionIndex(0);
    setGeminiQuestions([]);
    setCurrentGeminiIndex(0);
    setWordEmbeddingResults({});
    setShowIntroduction(false); // Reset introduction state
    setProcessComplete(false); // Reset process completion
    resetResultState();
    setErrorMessage("");
    setNotice("");
  }

  async function clearHistory(): Promise<void> {
    try {
      if (user) {
        await clearUserSessions(user.uid);
      }
      setHistory([]);
      setNotice("History cleared.");
    } catch (error) {
      console.error("Error clearing history:", error);
      setErrorMessage("Failed to clear history. Please try again.");
    }
  }

  const recentHistory = history.slice(0, 6);
  const diagnosisLabel = diagnosis
    ? STUCK_TYPE_LABELS[diagnosis.primaryType]
    : null;
  const firstAction = plan?.firstAction ?? null;

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
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-emerald-200">
                    <User className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 rounded-lg border border-rose-700 px-3 py-2 text-sm text-rose-200 hover:border-rose-500 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setAuthMode('signin');
                      setShowAuthModal(true);
                    }}
                    className="flex items-center gap-2 rounded-lg border border-lime-700 px-3 py-2 text-sm text-lime-200 hover:border-lime-500 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode('signup');
                      setShowAuthModal(true);
                    }}
                    className="flex items-center gap-2 rounded-lg bg-lime-300 px-3 py-2 text-sm text-emerald-950 hover:bg-lime-200 transition-colors"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {processComplete && (
          <div className="rounded-2xl border border-emerald-900 bg-emerald-950/70 p-4">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TAB_LABELS) as AppTab[]).map((tabKey) => {
                const selected = activeTab === tabKey;

                return (
                  <button
                    key={tabKey}
                    type="button"
                    onClick={() => setActiveTab(tabKey)}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      selected
                        ? "border-lime-300 bg-lime-300/20"
                        : "border-emerald-800 hover:border-lime-500"
                    }`}
                  >
                    {TAB_LABELS[tabKey]}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => clearHistory()}
                className="rounded-lg border border-rose-700 px-3 py-2 text-sm text-rose-200 hover:border-rose-500"
              >
                Clear History
              </button>
            </div>
          </div>
        )}

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
                  Feeling stuck on your academic work? Let us help you identify what's holding you back.
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
                  className="rounded-2xl bg-lime-300 px-12 py-8 text-xl font-bold text-emerald-950 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  {loading ? "Starting..." : "I'M STUCK"}
                </button>
              </div>
            </div>
          ) : null}

          {activeTab === "introduction" ? (
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
                      <h3 className="font-semibold text-emerald-100">Quick Diagnosis</h3>
                      <p className="text-sm">We ask 5 research-based questions to understand why you're stuck</p>
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
                    This brief questionnaire helps diagnose academic paralysis - that feeling when you know what you need to do but can't seem to start. 
                    Based on research with students and professors, we identify patterns that keep you stuck.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={startQuestionnaire}
                  disabled={loading}
                  className="rounded-xl bg-lime-300 px-6 py-3 text-sm font-semibold text-emerald-950 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Starting..." : "Start Questionnaire"}
                </button>
                <button
                  type="button"
                  onClick={resetToHome}
                  className="rounded-xl border border-emerald-800 px-6 py-3 text-sm hover:border-lime-500"
                >
                  Back to Home
                </button>
              </div>
            </div>
          ) : null}

          {activeTab === "context" ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
                Session Context
              </h3>

              <div>
                <label htmlFor="subject" className="text-xs text-emerald-300">
                  Subject
                </label>
                <input
                  id="subject"
                  value={context.subject}
                  onChange={(event) =>
                    setContext((previous) => ({
                      ...previous,
                      subject: event.target.value,
                    }))
                  }
                  placeholder="e.g. Chemistry"
                  className="mt-1 w-full rounded-lg border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm outline-none ring-lime-300 focus:ring"
                />
              </div>

              <div>
                <label htmlFor="assignment" className="text-xs text-emerald-300">
                  Assignment Type
                </label>
                <input
                  id="assignment"
                  value={context.assignmentType}
                  onChange={(event) =>
                    setContext((previous) => ({
                      ...previous,
                      assignmentType: event.target.value,
                    }))
                  }
                  placeholder="Homework / Essay / Lab"
                  className="mt-1 w-full rounded-lg border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm outline-none ring-lime-300 focus:ring"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {["Homework", "Essay", "Lab", "Problem Set", "Exam Prep"].map(
                    (preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          setContext((previous) => ({
                            ...previous,
                            assignmentType: preset,
                          }))
                        }
                        className="rounded-md border border-emerald-800 px-2 py-1 text-xs hover:border-lime-500"
                      >
                        {preset}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs text-emerald-300">Time Stuck (minutes)</p>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setContext((previous) => ({
                        ...previous,
                        timeStuckMinutes: Math.max(0, previous.timeStuckMinutes - 5),
                      }))
                    }
                    className="rounded-md border border-emerald-800 px-3 py-1 text-sm hover:border-lime-500"
                  >
                    -
                  </button>
                  <span className="min-w-14 text-center text-sm">
                    {context.timeStuckMinutes}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setContext((previous) => ({
                        ...previous,
                        timeStuckMinutes: Math.min(300, previous.timeStuckMinutes + 5),
                      }))
                    }
                    className="rounded-md border border-emerald-800 px-3 py-1 text-sm hover:border-lime-500"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs text-emerald-300">Open Tasks</p>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setContext((previous) => ({
                        ...previous,
                        tasksOpenCount: Math.max(1, previous.tasksOpenCount - 1),
                      }))
                    }
                    className="rounded-md border border-emerald-800 px-3 py-1 text-sm hover:border-lime-500"
                  >
                    -
                  </button>
                  <span className="min-w-14 text-center text-sm">
                    {context.tasksOpenCount}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setContext((previous) => ({
                        ...previous,
                        tasksOpenCount: Math.min(20, previous.tasksOpenCount + 1),
                      }))
                    }
                    className="rounded-md border border-emerald-800 px-3 py-1 text-sm hover:border-lime-500"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs text-emerald-300">Energy Level</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={`energy-${value}`}
                      type="button"
                      onClick={() =>
                        setContext((previous) => ({
                          ...previous,
                          energyLevel: value as 1 | 2 | 3 | 4 | 5,
                        }))
                      }
                      className={`rounded-md border px-2 py-1 text-xs ${
                        context.energyLevel === value
                          ? "border-lime-300 bg-lime-300/20"
                          : "border-emerald-800 hover:border-lime-500"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-emerald-300">Panic Level</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={`panic-${value}`}
                      type="button"
                      onClick={() =>
                        setContext((previous) => ({
                          ...previous,
                          panicLevel: value as 1 | 2 | 3 | 4 | 5,
                        }))
                      }
                      className={`rounded-md border px-2 py-1 text-xs ${
                        context.panicLevel === value
                          ? "border-lime-300 bg-lime-300/20"
                          : "border-emerald-800 hover:border-lime-500"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setContext((previous) => ({
                      ...previous,
                      repeatedRereading: !previous.repeatedRereading,
                    }))
                  }
                  className={`rounded-md border px-3 py-2 text-xs text-left ${
                    context.repeatedRereading
                      ? "border-lime-300 bg-lime-300/20"
                      : "border-emerald-800 hover:border-lime-500"
                  }`}
                >
                  Repeated rereading: {context.repeatedRereading ? "Yes" : "No"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setContext((previous) => ({
                      ...previous,
                      excessiveEditing: !previous.excessiveEditing,
                    }))
                  }
                  className={`rounded-md border px-3 py-2 text-xs text-left ${
                    context.excessiveEditing
                      ? "border-lime-300 bg-lime-300/20"
                      : "border-emerald-800 hover:border-lime-500"
                  }`}
                >
                  Excessive editing: {context.excessiveEditing ? "Yes" : "No"}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={startQuestionnaire}
                  disabled={loading}
                  className="rounded-lg bg-lime-300 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Starting..." : "Start Diagnosis"}
                </button>
                <button
                  type="button"
                  onClick={resetToHome}
                  className="rounded-lg border border-emerald-800 px-4 py-2 text-sm hover:border-lime-500"
                >
                  Back to Home
                </button>
              </div>
            </div>
          ) : null}

          {activeTab === "questionnaire" ? (
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
                          onClick={() => currentQ && updateAnswer(currentQ.id, option.value)}
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
              {diagnosis ? (
                <>
                  <div className="rounded-xl border border-lime-600/50 bg-lime-950/30 p-6">
                    <div className="text-center space-y-4">
                      <p className="text-xs uppercase tracking-wide text-lime-200">
                        —----------Diagnosis—----------------
                      </p>
                      <h2 className="text-3xl font-bold text-lime-200">
                        {STUCK_TYPE_LABELS[diagnosis.primaryType]}
                      </h2>
                    </div>
                    
                    <div className="mt-6 space-y-3">
                      <h3 className="text-lg font-semibold text-emerald-100">Overall confidence levels for each stuck type</h3>
                      <div className="space-y-2">
                        {diagnosis.rankedTypes
                          .sort((a, b) => b.normalized - a.normalized)
                          .map((item, index) => (
                            <div key={item.type} className="flex items-center justify-between p-3 rounded-lg border border-emerald-800 bg-emerald-950/40">
                              <div className="flex items-center space-x-3">
                                <span className="text-lime-200 font-semibold">#{index + 1}</span>
                                <span className="text-emerald-100">{STUCK_TYPE_LABELS[item.type]}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="w-24 h-2 bg-emerald-900 rounded-full">
                                  <div 
                                    className="h-full bg-lime-300 rounded-full" 
                                    style={{ width: `${Math.round(item.normalized * 100)}%` }}
                                  />
                                </div>
                                <span className="text-emerald-200 text-sm w-12 text-right">
                                  {Math.round(item.normalized * 100)}%
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                    
                    <div className="mt-6 text-center space-y-3">
                      <p className="text-xs uppercase tracking-wide text-lime-200">
                        —-----Very Brief Summary—--------
                      </p>
                      <p className="text-emerald-100 text-sm leading-relaxed">
                        {diagnosis.summary}
                      </p>
                    </div>
                    
                    <div className="mt-6 text-center">
                      <button
                        type="button"
                        onClick={() => setActiveTab("intervention")}
                        className="rounded-xl bg-lime-300 px-6 py-3 text-sm font-semibold text-emerald-950 hover:bg-lime-200 transition-colors"
                      >
                        Do you want to change this?
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={async () => {
                        await generateInterventionPlans(diagnosis);
                        setActiveTab("intervention");
                      }}
                      disabled={loadingInterventions}
                      className="rounded-xl bg-lime-300 px-8 py-4 text-lg font-bold text-emerald-950 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                    >
                      {loadingInterventions ? "Loading..." : "What's the plan?"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-emerald-900 bg-emerald-950/60 p-4 text-sm text-emerald-200">
                  No diagnosis found. Complete the questionnaire to see your results.
                </div>
              )}
            </div>
          ) : null}

          {activeTab === "intervention" ? (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-semibold">Intervention Plans</h2>
                <p className="text-emerald-200">Generating personalized strategies based on your diagnosis...</p>
              </div>
              
              {loadingInterventions ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-lime-300"></div>
                  <p className="mt-4 text-emerald-200">This will take a second to load intervention plans...</p>
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
                      onClick={saveSession}
                      disabled={saving}
                      className="rounded-xl bg-lime-300 px-8 py-4 text-lg font-bold text-emerald-950 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                    >
                      {saving ? "Saving..." : "Save Diagnosis & Plans"}
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab("result")}
                      className="rounded-xl border border-emerald-800 px-6 py-3 text-sm hover:border-lime-500"
                    >
                      Back to Diagnosis
                    </button>
                    <button
                      type="button"
                      onClick={beginDiagnosis}
                      disabled={loading}
                      className="rounded-xl bg-lime-300 px-6 py-3 text-sm font-semibold text-emerald-950 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? "Starting..." : "New Diagnosis"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-emerald-200">No intervention plans available. Please complete the diagnosis first.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("result")}
                    className="mt-4 rounded-xl border border-emerald-800 px-6 py-3 text-sm hover:border-lime-500"
                  >
                    Back to Diagnosis
                  </button>
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
                    {insights.map((insight) => (
                      <div
                        key={insight.key}
                        className="rounded-lg border border-emerald-800 bg-emerald-950/60 p-3"
                      >
                        <p className="text-xs text-emerald-300">
                          Confidence: {insight.confidence}
                        </p>
                        <p className="mt-1 text-sm">{insight.message}</p>
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
                          setContext((previous) => ({
                            ...previous,
                            subject: session.subject,
                            assignmentType: session.assignmentType,
                            timeStuckMinutes: session.timeStuckMinutes,
                          }));
                          setNotice(
                            `Loaded context from ${session.subject} (${session.assignmentType}).`,
                          );
                          setActiveTab("context");
                        }}
                        className="w-full rounded-lg border border-emerald-800 bg-emerald-950/60 p-3 text-left hover:border-lime-500"
                      >
                        <p className="text-xs text-emerald-300">{session.subject}</p>
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
                <button
                  type="button"
                  onClick={() => setActiveTab("context")}
                  className="rounded-lg border border-emerald-800 px-4 py-2 text-sm hover:border-lime-500"
                >
                  Open Context Tab
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
        subject={context.subject}
        assignmentType={context.assignmentType}
        diagnosisLabel={diagnosisLabel}
        firstAction={firstAction}
        onOpenDiagnosisTab={() => setActiveTab("questionnaire")}
        onOpenPlanTab={() => setActiveTab("result")}
      />
      
      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md">
            <AuthForm 
              onClose={() => setShowAuthModal(false)} 
              initialMode={authMode}
            />
          </div>
        </div>
      )}
    </div>
  );
}
