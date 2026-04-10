#  How to Run the Model

Your model is **100% ready to run**. Here are the 3 easiest ways to test it:

## Option 1: Next.js API Route (Recommended) ⭐

The easiest way - model is already integrated into Next.js:

```bash
# Terminal 1: Start the dev server
npm run dev

# Terminal 2: Test the endpoint
curl http://localhost:3000/api/test-diagnosis
```

**Expected Output:**
```json
{
  "status": "success",
  "message": "Model is working correctly!",
  "diagnosis": {
    "primaryType": "confusion",
    "confidence": 0.85,
    "rankedTypes": [...],
    "summary": "You're confused about...",
    "embeddingVectorDimensions": 512,
    "internalFollowUpQuestionsCount": 5
  },
  "interventions": {
    "count": 3,
    "primaryPlan": { ... }
  },
  "cognition": {
    "distortionsFound": 0,
    "safetyFlagsCount": 1,
    "safetyFlags": ["high_shame"]
  }
}
```

---

## Option 2: Node.js CLI Test

For standalone testing outside Next.js:

```bash
# Compile TypeScript to JavaScript
npx tsc model/new/*.ts --target es2020 --module commonjs --outDir model/new/dist

# Run the test
node test-model.js
```

---

## Option 3: React Component Example

Import directly into a React component:

```tsx
// pages/diagnose.tsx
import { useState } from 'react';
import { diagnoseWithHybridModel, buildMultipleInterventionPlans } from '@/model/new/index';
import type { DiagnosticAnswers } from '@/model/new/types';

export default function DiagnosePage() {
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleDiagnose() {
    setLoading(true);
    try {
      const answers: DiagnosticAnswers = {
        understandsQuestion: 'partly',
        canSubmitBadInFiveMinutes: 'no',
        strongestEmotion: 'frustrated',
        taskScope: 'unclear',
        gradeWorry: 'high',
      };

      const result = await diagnoseWithHybridModel(answers);
      setDiagnosis(result);
    } catch (error) {
      console.error('Diagnosis failed:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleDiagnose} disabled={loading}>
        {loading ? 'Running Diagnosis...' : 'Start Diagnosis'}
      </button>
      {diagnosis && (
        <div>
          <h2>Diagnosis: {diagnosis.primaryType}</h2>
          <p>Confidence: {(diagnosis.confidence * 100).toFixed(1)}%</p>
          <p>{diagnosis.summary}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Option 4: Custom API Endpoint

Create your own endpoint with custom logic:

```bash
# Create a new endpoint
cat > app/api/diagnose/route.ts << 'EOF'
import { diagnoseWithHybridModel } from '@/model/new/index';
import type { DiagnosticAnswers } from '@/model/new/types';

export async function POST(request: Request) {
  const answers: DiagnosticAnswers = await request.json();
  const diagnosis = await diagnoseWithHybridModel(answers);
  return Response.json(diagnosis);
}
EOF

# Then call it:
curl -X POST http://localhost:3000/api/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "understandsQuestion": "partly",
    "canSubmitBadInFiveMinutes": "no",
    "strongestEmotion": "frustrated",
    "taskScope": "unclear",
    "gradeWorry": "high"
  }'
```

---

## Troubleshooting

### Error: "GEMINI_API_KEY not set"
Make sure `.env.local` exists with your API key:
```bash
cat .env.local
# Should contain: GEMINI_API_KEY=your-key-here
```

### Error: "Module not found"
Make sure dependencies are installed:
```bash
npm install
```

### Error: "Cannot find package @tensorflow..."
Dependencies need to be installed:
```bash
npm install @tensorflow/tfjs @tensorflow-models/universal-sentence-encoder @google/generative-ai
```

---

## What's Being Tested

The model test verifies:

 **Embedding Pipeline**
- Loads Universal Sentence Encoder (512-dim)
- Computes embedding vector for input
- Compares to stuck-type anchor statements

 **Gemini Integration**
- Connects to Google Generative AI
- Generates 5 internal follow-up questions
- Refines diagnosis with LLM

 **Score Blending**
- Combines embedding scores (50%)
- Combines Gemini scores (50%)
- Ranks all 6 stuck types HIGH→LOW

 **Cognitive Analysis**
- Detects thought distortions
- Identifies safety flags
- Generates risk levels

 **Intervention Planning**
- Creates multiple plan options
- Generates personalized steps
- Provides timing estimates

---

## Next Steps

Once the model is running:

1. **Integrate with UI**
   - Create questionnaire form with 5 questions
   - Display diagnosis results
   - Show intervention plans

2. **Track Results**
   - Store session records in database
   - Track student progress
   - Analyze patterns

3. **Deploy**
   - Set GEMINI_API_KEY in production env
   - Test with real student data
   - Monitor API costs (~$0.002 per diagnosis)

---

## Model Files Location

All model files are in: `/model/new/`

| File | Purpose |
|------|---------|
| `index.ts` | Public API exports |
| `types.ts` | Type definitions |
| `diagnosisEngine.ts` | Main diagnosis pipeline |
| `wordEmbedding.ts` | Embedding computation |
| `geminiIntegration.ts` | Gemini API calls |
| `interventionGenerator.ts` | Intervention planning |
| `cognitiveDistortions.ts` | Distortion & safety detection |
| `prompts.ts` | Gemini prompt templates |
| `weights.ts` | Configuration parameters |

---

## Quick API Reference

### Main Function
```typescript
const diagnosis = await diagnoseWithHybridModel(answers);
// Returns: primaryType, confidence, rankedTypes (HIGH→LOW), 
//          embeddingVector [512-dim], internalFollowUpQuestions [5]
```

### Intervention Plans
```typescript
const plans = await buildMultipleInterventionPlans(stuckType);
// Returns: array of InterventionPlan objects with steps & timing
```

### Cognitive Analysis
```typescript
const distortions = detectThoughtDistortions({ studentStatement });
const flags = buildSafetyFlags({ studentStatement, shameScore, panicScore });
```

See `/model/new/API.md` for complete function reference.

---

**Questions?** Check `/model/new/README.md` for feature overview or `/model/new/USAGE.md` for more examples.
