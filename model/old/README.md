# Stuck Sentiment Model

`stuckSentimentModel.ts` is a domain-specific sentiment and paralysis diagnosis engine for academic work.

## What it does

- Classifies one of 6 stuck types:
  - `confusion_stuck`
  - `ambiguity_stuck`
  - `fear_stuck`
  - `overwhelm_stuck`
  - `exhaustion_stuck`
  - `perfection_loop_stuck`
- Scores emotional state (fear, shame, overwhelm, mental energy, valence, arousal).
- Detects common thought distortions from student self-talk.
- Returns a safe intervention plan with a tiny next step and timer.
- Produces weekly pattern insights from session history.
- Enforces guardrails: no cheating, no assignment completion on behalf of student.

## API route

POST `/api/stuck/diagnose`

Example request body:

```json
{
  "subject": "chemistry",
  "assignmentType": "problem set",
  "assignmentText": "Complete questions 1-10 with full steps.",
  "studentStatement": "I keep staring at it and feel like if I do this wrong my grade drops.",
  "selfTalk": ["If this is bad, I am bad at science."],
  "answers": {
    "understandsQuestion": "yes",
    "canSubmitBadIn5Min": "no",
    "strongestEmotion": "scared",
    "taskScope": "large",
    "gradeWorry": "high"
  },
  "signals": {
    "minutesStuck": 45,
    "tabSwitching": true,
    "anxietySpikeOnOpen": true,
    "shameLevel": 7,
    "fearLevel": 9
  }
}
```

Example response (shape):

```json
{
  "diagnosis": {
    "primaryType": "fear_stuck",
    "confidence": 0.84,
    "typeScores": {},
    "sentiment": {},
    "distortions": [],
    "intervention": {},
    "safetyFlags": [],
    "guardrails": []
  },
  "adaptiveQuestions": []
}
```

## Core functions

- `diagnoseStuck(input)` -> full diagnosis object.
- `generateAdaptiveQuestions(prior)` -> 5-question adaptive check-in flow.
- `generateClarificationQuestions(text, subject)` -> question prompts for confusion cases.
- `rephraseAssignmentInstructions(text)` -> assignment simplification helper.
- `buildSessionRecord(input, diagnosis, outcome)` -> normalized session event.
- `buildWeeklyInsights(sessions)` -> trend and risk summary.
