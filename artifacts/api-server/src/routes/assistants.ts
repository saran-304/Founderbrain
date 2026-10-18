import { Router, type IRouter } from 'express';
import * as api from '@workspace/api-zod';
import {
  getRequestSupabase,
  getRequestUser,
  requireWorkspaceAccess,
  sendSupabaseError,
} from '../lib/supabase-api';

const router: IRouter = Router();
const GEMINI_MODEL = 'gemini-3.8-flash';
const ASSISTANT_GUIDANCE = [
  'You are a startup planning assistant. Use only facts the founder provides in their prompt.',
  'Do not claim to have performed market research, contacted anyone, verified competitors, or confirmed demand.',
  'Label assumptions and unknowns. Separate evidence from hypotheses, and give practical next steps.',
  'Do not invent customers, traction, revenue, investor names, statistics, or citations.',
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
    res.status(503).json({ error: 'Gemini is not configured. Add GEMINI_API_KEY in Replit Secrets.' });
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
            maxOutputTokens: 8192,
            temperature: 0.35,
          },
        }),
        signal: AbortSignal.timeout(45_000),
      },
    );

    if (!response.ok) {
      req.log.warn({ providerStatus: response.status }, 'Gemini assistant request failed');
      res.status(502).json({ error: 'The assistant provider could not complete this run. Please try again.' });
      return;
    }

    const result = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    output = (result.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? '')
      .join('')
      .trim();
  } catch (error) {
    req.log.warn(
      { errorType: error instanceof Error ? error.name : 'unknown' },
      'Gemini assistant request could not be reached',
    );
    res.status(502).json({ error: 'The assistant provider could not be reached. Please try again.' });
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

export default router;
