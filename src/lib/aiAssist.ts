import { Question } from '../types/database';

export interface AiStep {
  step_number: number;
  title: string;
  guidance: string;
}

export interface AiGuidanceResponse {
  progress_summary: string;
  total_steps: number;
  steps: AiStep[];
}

/**
 * Supported active models ordered by user priority & highest RPM/RPD allocation:
 * 1. Gemma 4 31B (30 RPM / 14.4K RPD - Main coding assistant)
 * 2. Gemma 4 26B (30 RPM / 14.4K RPD - Backup / fast alternative)
 * 3. Gemini 3.5 Flash-Lite (15 RPM / 500 RPD - High-context alternative)
 * 4. Gemini 3.1 Flash-Lite (15 RPM / 500 RPD - Lightweight fallback)
 * 5. Gemini 3.8 Flash (5 RPM / 20 RPD - Higher-capability testing)
 * 6. Gemini 3.5 Flash / Gemini 3 / Gemini 2.5 series
 */
const GEMINI_MODELS = [
  // 1 & 2: High RPM Gemma 4 Series (30 RPM / 14.4K RPD)
  'gemma-4-31b-it',
  'gemma-4-31b',
  'gemma-4-26b-a4b-it',
  'gemma-4-26b-it',
  'gemma-4-26b',

  // 3 & 4: Flash-Lite Series (15 RPM / 500 RPD)
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash-lite-preview',
  'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite-preview',

  // 5 & 6: Flash Series
  'gemini-3.8-flash',
  'gemini-3.8-flash-preview',
  'gemini-3.5-flash',
  'gemini-3.5-flash-preview',
  'gemini-3-flash-preview',

  // Robust fallback family
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-pro',
  'gemini-pro-latest',
];

/**
 * Groq models for high-speed fallback inference (Prioritized by user quota):
 * 1. openai/gpt-oss-120b (30 RPM / 1K RPD)
 * 2. openai/gpt-oss-20b (30 RPM / 1K RPD)
 * 3. qwen/qwen3.8-27b (30 RPM / 1K RPD)
 * 4. allam-2-7b (30 RPM / 7K RPD)
 * 5. llama-3.3-70b-versatile, llama-3.1-8b-instant, gemma2-9b-it
 */
const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'allam-2-7b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
  'mixtral-8x7b-32768',
];

/**
 * Robust JSON extractor that handles markdown code blocks or edge trailing characters.
 */
function extractJson(text: string): string {
  const cleaned = text.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

/**
 * Extracts and deduplicates all configured Groq API keys for fallback support.
 */
export function getGroqApiKeys(): string[] {
  const keys: string[] = [];

  const addKeyString = (raw?: string) => {
    if (!raw) return;
    const parts = raw.split(',').map(k => k.trim()).filter(Boolean);
    for (const k of parts) {
      if (k && k !== 'YOUR_GROQ_API_KEY_HERE' && !keys.includes(k)) {
        keys.push(k);
      }
    }
  };

  const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : ({} as any);

  addKeyString(env.VITE_GROQ_API_KEY);
  addKeyString(env.VITE_GROQ_API_KEYS);
  addKeyString(env.VITE_GROQ_API_KEY_1);
  addKeyString(env.VITE_GROQ_API_KEY_2);

  if (typeof window !== 'undefined') {
    if (Array.isArray((window as any).__GROQ_API_KEYS__)) {
      for (const k of (window as any).__GROQ_API_KEYS__) {
        addKeyString(k);
      }
    } else if (typeof (window as any).__GROQ_API_KEY__ === 'string') {
      addKeyString((window as any).__GROQ_API_KEY__);
    }
  }

  return keys;
}

/**
 * Extracts and deduplicates all configured Gemini API keys for fallback support.
 */
export function getGeminiApiKeys(): string[] {
  const keys: string[] = [];

  const addKeyString = (raw?: string) => {
    if (!raw) return;
    const parts = raw.split(',').map(k => k.trim()).filter(Boolean);
    for (const k of parts) {
      if (k && k !== 'YOUR_GEMINI_API_KEY_HERE' && !keys.includes(k)) {
        keys.push(k);
      }
    }
  };

  const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : ({} as any);

  // 1. Primary variable (supports single or comma-separated: "key1,key2,key3")
  addKeyString(env.VITE_GEMINI_API_KEY);

  // 2. Dedicated plural comma-separated variable
  addKeyString(env.VITE_GEMINI_API_KEYS);

  // 3. Numbered fallback variables
  addKeyString(env.VITE_GEMINI_API_KEY_1);
  addKeyString(env.VITE_GEMINI_API_KEY_2);
  addKeyString(env.VITE_GEMINI_API_KEY_3);
  addKeyString(env.VITE_GEMINI_API_KEY_4);

  // 4. Runtime window overrides (if set)
  if (typeof window !== 'undefined') {
    if (Array.isArray((window as any).__GEMINI_API_KEYS__)) {
      for (const k of (window as any).__GEMINI_API_KEYS__) {
        addKeyString(k);
      }
    } else if (typeof (window as any).__GEMINI_API_KEY__ === 'string') {
      addKeyString((window as any).__GEMINI_API_KEY__);
    }
  }

  return keys;
}

/**
 * Executes a guidance request using Groq API (OpenAI-compatible).
 */
async function callGroqModel(apiKey: string, model: string, promptText: string): Promise<AiGuidanceResponse> {
  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  
  const payload: any = {
    model,
    messages: [
      {
        role: 'system',
        content: 'You are an AI Coding Coach. You strictly output valid JSON objects matching the schema without code syntax.',
      },
      {
        role: 'user',
        content: promptText,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 2048,
  };

  let response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  // If response_format is rejected with 400 on a specific model, retry without it
  if (!response.ok && payload.response_format) {
    delete payload.response_format;
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.warn(`[AI Assist] Groq (${model}) status ${response.status}:`, errorText.substring(0, 150));
    throw new Error(`Groq (${model}): HTTP ${response.status}`);
  }

  const result = await response.json();
  const rawText = result.choices?.[0]?.message?.content;
  if (!rawText) {
    throw new Error(`Empty response from Groq model '${model}'`);
  }

  const jsonStr = extractJson(rawText);
  const parsed: AiGuidanceResponse = JSON.parse(jsonStr);
  if (!parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error('Invalid steps schema returned from Groq');
  }

  return parsed;
}

/**
 * Builds the structured prompt for AI coaches.
 * Strictly forbids C code blocks or code syntax, instructing conceptual next-action only.
 */
function buildAiPrompt(question: Question, studentCode: string): string {
  // Truncate overly long student code to conserve tokens while preserving structure
  const codeSnippet = studentCode && studentCode.length > 2500
    ? studentCode.substring(0, 2500) + '\n// ... (remaining code truncated for brevity)'
    : (studentCode || '// No code written yet');

  return `You are an encouraging AI Coding Coach for a C Programming assessment.

### YOUR GOAL:
Inspect the student's current code against the problem statement. Acknowledge what they have already done, identify what is missing, and provide a progressive sequence of 3 to 4 sequential guidance steps explaining WHAT to do next conceptually.

### STRICT RULES:
1. NEVER output actual C code snippets, code syntax, or code blocks.
2. ONLY explain conceptually WHAT logical or algorithmic step the student should do next in plain English (e.g. "Read the second number from the user", "Declare an integer variable to calculate the sum", "Compare the number against zero using a conditional branch", "Print the result followed by a newline").
3. Meet the student where they are: Analyze their existing variables, standard I/O, loops, and logic.
4. Keep each step clear, actionable, and concise (1 to 2 sentences per step).
5. Return ONLY a valid JSON object matching the schema below.

### PROBLEM DETAILS:
- Title: ${question.title}
- Description: ${question.description}
- Input Format: ${question.input_format || 'Standard Input'}
- Output Format: ${question.output_format || 'Standard Output'}
- Constraints: ${question.constraints || 'Standard C Constraints'}

### STUDENT'S CURRENT CODE:
\`\`\`c
${codeSnippet}
\`\`\`

### REQUIRED JSON SCHEMA:
{
  "progress_summary": "1 sentence summarizing what the student already did correctly",
  "total_steps": 3,
  "steps": [
    {
      "step_number": 1,
      "title": "Short action title (e.g., 'Read the Second Input')",
      "guidance": "1-2 sentences explaining what to do next conceptually without any code syntax."
    }
  ]
}`;
}

/**
 * Requests 1-time live step-by-step guidance supporting Groq, Gemma, and Gemini API keys with cascading fallback.
 */
export async function requestAiGuidance(
  question: Question,
  studentCode: string
): Promise<AiGuidanceResponse> {
  const groqKeys = getGroqApiKeys();
  const geminiKeys = getGeminiApiKeys();

  if (groqKeys.length === 0 && geminiKeys.length === 0) {
    throw new Error('No AI API key found. Please add VITE_GROQ_API_KEY or VITE_GEMINI_API_KEY in your .env file.');
  }

  const promptText = buildAiPrompt(question, studentCode);
  let lastError: any = null;

  // 1. Try Groq API first if configured (Ultra-fast high RPM inference)
  for (let keyIdx = 0; keyIdx < groqKeys.length; keyIdx++) {
    const key = groqKeys[keyIdx];
    for (const model of GROQ_MODELS) {
      try {
        const result = await callGroqModel(key, model, promptText);
        if (result) return result;
      } catch (err: any) {
        console.warn(`[AI Assist] Groq Key #${keyIdx + 1} (${model}) threw error:`, err.message);
        lastError = err;
      }
    }
  }

  // 2. Try Gemini & Gemma Models via Google AI Studio API
  for (let keyIdx = 0; keyIdx < geminiKeys.length; keyIdx++) {
    const key = geminiKeys[keyIdx];

    for (const model of GEMINI_MODELS) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const isGemma = model.toLowerCase().startsWith('gemma');
      
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: promptText,
              },
            ],
          },
        ],
        generationConfig: {
          ...(isGemma ? {} : { responseMimeType: 'application/json' }),
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      };

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`[AI Assist] Key #${keyIdx + 1} (${model}) status ${response.status}:`, errorText.substring(0, 150));
          lastError = new Error(`Key #${keyIdx + 1} (${model}): HTTP ${response.status}`);
          continue;
        }

        const result = await response.json();
        const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
          console.warn(`[AI Assist] Key #${keyIdx + 1} (${model}) returned empty text.`);
          lastError = new Error(`Empty response from model '${model}'`);
          continue;
        }

        const jsonStr = extractJson(rawText);
        const parsed: AiGuidanceResponse = JSON.parse(jsonStr);
        if (!parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
          console.warn(`[AI Assist] Key #${keyIdx + 1} (${model}) returned invalid schema.`);
          lastError = new Error('Invalid steps schema returned from AI');
          continue;
        }

        // Successfully generated conceptual guidance!
        return parsed;
      } catch (err: any) {
        console.warn(`[AI Assist] Key #${keyIdx + 1} (${model}) threw error:`, err.message);
        lastError = err;
      }
    }
  }

  console.error('[AI Assist] All configured Groq & Gemini API keys failed:', lastError);
  throw new Error(lastError?.message || 'Failed to generate AI guidance. Please verify your API key quotas.');
}
