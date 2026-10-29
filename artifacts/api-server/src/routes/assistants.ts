import { Router, type IRouter } from 'express';
import * as api from '@workspace/api-zod';
import {
  getRequestSupabase,
  getRequestUser,
  requireWorkspaceAccess,
  sendSupabaseError,
} from '../lib/supabase-api';

const router: IRouter = Router();
const GEMINI_MODEL = 'gemini-3.6-flash'; // Using 3.6-flash for better availability (3.8-flash is frequently overloaded)
const GEMINI_TIMEOUT_MS = 60_000; // 60 seconds
const MAX_OUTPUT_TOKENS = 8192; // Increased for meaningful responses
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // Base delay for exponential backoff

const ASSISTANT_GUIDANCE = [
  'You are a startup planning assistant helping founders build their startups on FounderBrain.',
  'FounderBrain is an AI-powered platform that helps students validate startup ideas, find co-founders, build teams, connect with mentors, and manage startup projects.',
  'When a founder mentions "FounderBrain" or refers to their product on this platform, understand it refers to this student-focused startup management and collaboration platform. Use the definition above when analyzing FounderBrain as the product being validated.',
  'For the founder\'s specific startup idea (not FounderBrain itself), use only facts the founder provides in their prompt about their specific implementation, customers, market, or metrics.',
  'Do not claim to have performed market research, contacted anyone, verified competitors, or confirmed demand for their specific idea.',
  'Label assumptions and unknowns. Separate evidence from hypotheses, and give practical next steps.',
  'Do not invent customer numbers, traction, revenue, investor names, or specific statistics.',
].join(' ');

function toRun(row: any) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    kind: row.kind,
    prompt: row.prompt,
    output: row.output,
    createdAt: row.created_at,
  };
}

function instructionFor(kind: string) {
  const guidance: Record<string, string> = {
    idea_validation: 'Structure the response as: problem hypothesis, customer hypothesis, current evidence, riskiest assumptions, low-cost tests, and decision criteria.',
    business_plan: 'Structure the response as: executive summary, problem, solution, customer, business model, go-to-market, operations, risks, and assumptions to verify.',
    product_roadmap: 'Structure the response as: outcomes, MVP scope, sequenced milestones, dependencies, risks, and measurable acceptance criteria.',
    pitch_prep: 'Structure the response as: pitch narrative, slide outline, likely investor questions, evidence gaps, and claims the founder should verify.',
  };
  return guidance[kind] ?? 'Give a concise, practical startup plan and clearly identify assumptions.';
}

// Helper function for exponential backoff with jitter
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function shouldRetry(statusCode: number, attempt: number): boolean {
  // Retry on rate limit (429) and server errors (5xx)
  // Max 3 retries
  if (attempt >= MAX_RETRIES) return false;
  if (statusCode === 429) return true;
  if (statusCode >= 500 && statusCode < 600) return true;
  return false;
}

function getRetryDelay(attempt: number): number {
  // Exponential backoff with jitter: base * 2^attempt + random jitter
  const baseDelay = RETRY_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 500; // Up to 500ms jitter
  return baseDelay + jitter;
}

router.get('/assistants/runs', async (req, res): Promise<void> => {
  const params = api.ListAssistantRunsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: 'A valid workspaceId is required.' });
    return;
  }
  if (!(await requireWorkspaceAccess(req, res, params.data.workspaceId))) return;
  const { data, error } = await getRequestSupabase(req)
    .from('assistant_runs')
    .select('*')
    .eq('workspace_id', params.data.workspaceId)
    .order('created_at', { ascending: false });
  if (error) {
    sendSupabaseError(req, res, error, 'load assistant history');
    return;
  }
  res.json(api.ListAssistantRunsResponse.parse((data ?? []).map(toRun)));
});

router.post('/assistants/runs', async (req, res): Promise<void> => {
  const body = api.CreateAssistantRunBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: 'Enter a prompt between 20 and 8,000 characters.' });
    return;
  }
  if (!(await requireWorkspaceAccess(req, res, body.data.workspaceId))) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'Gemini is not configured. Add GEMINI_API_KEY to your environment variables.' });
    return;
  }

  // Validate API key format (starts with AIza for standard keys, or is an auth key)
  if (!apiKey.startsWith('AIza') && !apiKey.startsWith('REDACTED_SECRET {
    req.log.warn({ keyType: apiKey.substring(0, 4) + '...' }, 'Invalid Gemini API key format');
    res.status(503).json({ error: 'Gemini API key has invalid format. Get a valid key from https://aistudio.google.com/apikey' });
    return;
  }

  const supabase = getRequestSupabase(req);
  const userId = getRequestUser(req).id;
  const { count, error: countError } = await supabase
    .from('assistant_runs')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', userId)
    .gte('created_at', new Date(Date.now() - 60_000).toISOString());
  if (countError) {
    sendSupabaseError(req, res, countError, 'check assistant usage');
    return;
  }
  if ((count ?? 0) >= 3) {
    res.status(429).json({ error: 'Please wait a minute before starting another assistant run.' });
    return;
  }

  let output = '';
  let lastError: string | null = null;
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: `${ASSISTANT_GUIDANCE} ${instructionFor(body.data.kind)}` }],
            },
            contents: [{
              role: 'user',
              parts: [{ text: body.data.prompt.trim() }],
            }],
            generationConfig: {
              maxOutputTokens: MAX_OUTPUT_TOKENS,
              temperature: 0.35,
            },
          }),
          signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        lastError = errorText;
        req.log.warn({ 
          providerStatus: response.status, 
          errorBody: errorText,
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES
        }, 'Gemini assistant request failed');

        // Check if we should retry
        if (shouldRetry(response.status, attempt)) {
          attempt++;
          const delay = getRetryDelay(attempt);
          req.log.info({ delay, nextAttempt: attempt + 1 }, 'Retrying Gemini request after delay');
          await sleep(delay);
          continue;
        }

        // Return specific error messages based on status code
        if (response.status === 401) {
          res.status(503).json({ 
            error: 'Gemini API key is invalid or expired. Get a valid key from https://aistudio.google.com/apikey and ensure it has API restrictions applied to the Gemini API.' 
          });
        } else if (response.status === 403) {
          res.status(503).json({ 
            error: 'Gemini API access forbidden. Check your API key restrictions, billing setup, and project eligibility.' 
          });
        } else if (response.status === 429) {
          res.status(429).json({ 
            error: 'Gemini API rate limit exceeded. Please wait a moment and try again.' 
          });
        } else if (response.status === 404) {
          res.status(503).json({ 
            error: `Gemini model '${GEMINI_MODEL}' not found. This may be a temporary issue or the model has been deprecated.` 
          });
        } else {
          res.status(502).json({ 
            error: `Gemini API returned error ${response.status}. Please try again later.` 
          });
        }
        return;
      }

      const result = await response.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      output = (result.candidates?.[0]?.content?.parts ?? [])
        .map((part) => part.text ?? '')
        .join('')
        .trim();

      // Success - break out of retry loop
      break;
    } catch (error) {
      const errorType = error instanceof Error ? error.name : 'unknown';
      const errorMessage = error instanceof Error ? error.message : String(error);
      lastError = errorMessage;
      
      req.log.warn(
        { errorType, errorMessage, attempt: attempt + 1 },
        'Gemini assistant request could not be reached',
      );

      // Check if error is retryable (network errors, timeouts)
      if (attempt < MAX_RETRIES && (errorType === 'TimeoutError' || errorType === 'AbortError' || errorMessage.includes('fetch'))) {
        attempt++;
        const delay = getRetryDelay(attempt);
        req.log.info({ delay, nextAttempt: attempt + 1 }, 'Retrying after network error');
        await sleep(delay);
        continue;
      }

      res.status(502).json({ 
        error: 'The assistant provider could not be reached. Please check your network connection and try again.' 
      });
      return;
    }
  }

  // If we exhausted retries without success
  if (!output && attempt > MAX_RETRIES) {
    req.log.error({ attempts: attempt, lastError }, 'Gemini request failed after all retries');
    res.status(502).json({ 
      error: 'The assistant provider is temporarily unavailable after multiple attempts. Please try again later.' 
    });
    return;
  }

  if (!output) {
    res.status(502).json({ error: 'The assistant provider returned no text. Please try again.' });
    return;
  }

  const { data, error } = await supabase
    .from('assistant_runs')
    .insert({
      workspace_id: body.data.workspaceId,
      created_by: userId,
      kind: body.data.kind,
      prompt: body.data.prompt.trim(),
      output,
    })
    .select('*')
    .single();
  if (error) {
    sendSupabaseError(req, res, error, 'save assistant output');
    return;
  }
  res.status(201).json(api.CreateAssistantRunResponse.parse(toRun(data)));
});

router.delete('/assistants/runs/:runId', async (req, res): Promise<void> => {
  const params = api.DeleteAssistantRunParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid runId is required.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('assistant_runs')
    .delete()
    .eq('id', params.data.runId)
    .eq('created_by', getRequestUser(req).id)
    .select('id')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'delete assistant run');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Assistant run not found or you cannot delete it.' });
    return;
  }
  res.status(204).end();
});

// AI configuration diagnostic endpoint (does not expose API key)
router.get('/assistants/health', async (req, res): Promise<void> => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  const diagnostics = {
    configured: Boolean(apiKey),
    model: GEMINI_MODEL,
    keyFormat: apiKey ? (apiKey.startsWith('AIza') ? 'standard' : apiKey.startsWith('REDACTED_SECRET ? 'authorization' : 'unknown') : 'none',
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    timeout: `${GEMINI_TIMEOUT_MS}ms`,
    maxRetries: MAX_RETRIES,
  };

  if (!apiKey) {
    res.json({
      status: 'not_configured',
      ...diagnostics,
      message: 'GEMINI_API_KEY environment variable is not set',
    });
    return;
  }

  // Try a minimal models.list request to verify key validity
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey,
        },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (response.ok) {
      const data = await response.json() as { models?: Array<{ name: string }> };
      const hasModel = data.models?.some((m) => m.name === `models/${GEMINI_MODEL}`);
      
      res.json({
        status: 'operational',
        ...diagnostics,
        modelAvailable: hasModel,
        message: hasModel ? 'AI assistant is ready' : `Model ${GEMINI_MODEL} not found in available models`,
      });
    } else if (response.status === 401) {
      res.json({
        status: 'invalid_key',
        ...diagnostics,
        message: 'API key is invalid or expired. Get a valid key from https://aistudio.google.com/apikey',
      });
    } else if (response.status === 403) {
      res.json({
        status: 'access_forbidden',
        ...diagnostics,
        message: 'API key access forbidden. Check API key restrictions and billing setup',
      });
    } else {
      res.json({
        status: 'error',
        ...diagnostics,
        message: `Gemini API returned error ${response.status}`,
      });
    }
  } catch (error) {
    req.log.warn({ errorType: error instanceof Error ? error.name : 'unknown' }, 'AI health check failed');
    res.json({
      status: 'unreachable',
      ...diagnostics,
      message: 'Could not reach Gemini API. Check network connectivity',
    });
  }
});

export default router;

// Export the health endpoint separately so it can be mounted before auth middleware
export const publicAiHealthRouter = Router();

// Health check handler function
async function aiHealthCheck(req: any, res: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  const diagnostics = {
    configured: Boolean(apiKey),
    model: GEMINI_MODEL,
    keyFormat: apiKey ? (apiKey.startsWith('AIza') ? 'standard' : apiKey.startsWith('REDACTED_SECRET ? 'authorization' : 'unknown') : 'none',
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    timeout: `${GEMINI_TIMEOUT_MS}ms`,
    maxRetries: MAX_RETRIES,
  };

  if (!apiKey) {
    res.json({
      status: 'not_configured',
      ...diagnostics,
      message: 'GEMINI_API_KEY environment variable is not set',
    });
    return;
  }

  // Try a minimal models.list request to verify key validity
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey,
        },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (response.ok) {
      const data = await response.json() as { models?: Array<{ name: string }> };
      const hasModel = data.models?.some((m) => m.name === `models/${GEMINI_MODEL}`);
      
      res.json({
        status: 'operational',
        ...diagnostics,
        modelAvailable: hasModel,
        message: hasModel ? 'AI assistant is ready' : `Model ${GEMINI_MODEL} not found in available models`,
      });
    } else if (response.status === 401) {
      res.json({
        status: 'invalid_key',
        ...diagnostics,
        message: 'API key is invalid or expired. Get a valid key from https://aistudio.google.com/apikey',
      });
    } else if (response.status === 403) {
      res.json({
        status: 'access_forbidden',
        ...diagnostics,
        message: 'API key access forbidden. Check API key restrictions and billing setup',
      });
    } else {
      res.json({
        status: 'error',
        ...diagnostics,
        message: `Gemini API returned error ${response.status}`,
      });
    }
  } catch (error) {
    res.json({
      status: 'unreachable',
      ...diagnostics,
      message: 'Could not reach Gemini API. Check network connectivity',
    });
  }
}

publicAiHealthRouter.get('/assistants/health', aiHealthCheck);
