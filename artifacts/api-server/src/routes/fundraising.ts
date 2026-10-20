import { Router, type IRouter } from 'express';
import * as api from '@workspace/api-zod';
import {
  getRequestSupabase,
  getRequestUser,
  requireWorkspaceAccess,
  requireWorkspaceAdmin,
  sendSupabaseError,
} from '../lib/supabase-api';

const router: IRouter = Router();

function toInvestor(row: any) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    organization: row.organization,
    websiteUrl: row.website_url,
    pipelineStage: row.pipeline_stage,
    sourceType: row.source_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toNote(row: any) {
  return {
    id: row.id,
    investorId: row.investor_id,
    authorId: row.author_id,
    content: row.content,
    createdAt: row.created_at,
  };
}

function toFollowUp(row: any) {
  return {
    id: row.id,
    investorId: row.investor_id,
    title: row.title,
    dueDate: row.due_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}


router.get('/workspaces/:workspaceId/fundraising-stage', async (req, res): Promise<void> => {
  const params = api.GetFundraisingStageParams.safeParse(req.params);

  if (!params.success) {
    res.status(400).json({ error: 'A valid workspaceId is required.' });
    return;
  }

  if (!(await requireWorkspaceAccess(req, res, params.data.workspaceId))) return;

  const { data, error } = await getRequestSupabase(req)
    .from('workspaces')
    .select('id,fundraising_stage,created_at')
    .eq('id', params.data.workspaceId)
    .single();

  if (error) {
    req.log.error(
      {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
      'Fundraising stage Supabase query failed',
    );
    sendSupabaseError(req, res, error, 'load fundraising stage');
    return;
  }

  res.json(
    api.GetFundraisingStageResponse.parse({
      workspaceId: data.id,
      stage: data.fundraising_stage,
      updatedAt: data.created_at,
    }),
  );
});


router.get('/workspaces/:workspaceId/investors', async (req, res): Promise<void> => {
  const params = api.ListInvestorsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid workspaceId is required.' });
    return;
  }
  if (!(await requireWorkspaceAdmin(req, res, params.data.workspaceId))) return;
  const { data, error } = await getRequestSupabase(req)
    .from('investors')
    .select('*')
    .eq('workspace_id', params.data.workspaceId)
    .order('updated_at', { ascending: false });
  if (error) {
    sendSupabaseError(req, res, error, 'load investor records');
    return;
  }
  res.json(api.ListInvestorsResponse.parse((data ?? []).map(toInvestor)));
});

router.post('/workspaces/:workspaceId/investors', async (req, res): Promise<void> => {
  const params = api.CreateInvestorParams.safeParse(req.params);
  const body = api.CreateInvestorBody.safeParse(req.body);
  if (!params.success || !body.success || body.data.workspaceId !== params.data.workspaceId) {
    res.status(400).json({ error: 'Enter valid investor details for this workspace.' });
    return;
  }
  if (!(await requireWorkspaceAdmin(req, res, params.data.workspaceId))) return;
  const { data, error } = await getRequestSupabase(req)
    .from('investors')
    .insert({
      workspace_id: params.data.workspaceId,
      name: body.data.name.trim(),
      organization: body.data.organization?.trim() || null,
      website_url: body.data.websiteUrl ?? null,
      pipeline_stage: body.data.pipelineStage ?? 'researching',
    })
    .select('*')
    .single();
  if (error) {
    sendSupabaseError(req, res, error, 'create investor record');
    return;
  }
  res.status(201).json(api.CreateInvestorResponse.parse(toInvestor(data)));
});

router.patch('/investors/:investorId', async (req, res): Promise<void> => {
  const params = api.UpdateInvestorParams.safeParse(req.params);
  const body = api.UpdateInvestorBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: 'Enter valid investor updates.' });
    return;
  }
  const patch: Record<string, unknown> = {};
  if (body.data.name !== undefined) patch.name = body.data.name.trim();
  if (body.data.organization !== undefined) patch.organization = body.data.organization?.trim() || null;
  if (body.data.websiteUrl !== undefined) patch.website_url = body.data.websiteUrl;
  if (body.data.pipelineStage !== undefined) patch.pipeline_stage = body.data.pipelineStage;
  const { data, error } = await getRequestSupabase(req)
    .from('investors')
    .update(patch)
    .eq('id', params.data.investorId)
    .select('*')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'update investor record');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Investor not found or you do not have access.' });
    return;
  }
  res.json(api.UpdateInvestorResponse.parse(toInvestor(data)));
});

router.delete('/investors/:investorId', async (req, res): Promise<void> => {
  const params = api.DeleteInvestorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid investorId is required.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('investors')
    .delete()
    .eq('id', params.data.investorId)
    .select('id')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'delete investor record');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Investor not found or you do not have access.' });
    return;
  }
  res.status(204).end();
});

router.get('/investors/:investorId/notes', async (req, res): Promise<void> => {
  const params = api.ListInvestorNotesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid investorId is required.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('investor_notes')
    .select('*')
    .eq('investor_id', params.data.investorId)
    .order('created_at', { ascending: false });
  if (error) {
    sendSupabaseError(req, res, error, 'load investor notes');
    return;
  }
  res.json(api.ListInvestorNotesResponse.parse((data ?? []).map(toNote)));
});

router.post('/investors/:investorId/notes', async (req, res): Promise<void> => {
  const params = api.CreateInvestorNoteParams.safeParse(req.params);
  const body = api.CreateInvestorNoteBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: 'Write a note between 1 and 4,000 characters.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('investor_notes')
    .insert({
      investor_id: params.data.investorId,
      author_id: getRequestUser(req).id,
      content: body.data.content.trim(),
    })
    .select('*')
    .single();
  if (error) {
    sendSupabaseError(req, res, error, 'create investor note');
    return;
  }
  res.status(201).json(api.CreateInvestorNoteResponse.parse(toNote(data)));
});

router.patch('/investor-notes/:noteId', async (req, res): Promise<void> => {
  const params = api.UpdateInvestorNoteParams.safeParse(req.params);
  const body = api.UpdateInvestorNoteBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: 'Enter a valid investor note update.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('investor_notes')
    .update({ content: body.data.content.trim() })
    .eq('id', params.data.noteId)
    .eq('author_id', getRequestUser(req).id)
    .select('*')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'update investor note');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Investor note not found or you cannot edit it.' });
    return;
  }
  res.json(api.UpdateInvestorNoteResponse.parse(toNote(data)));
});

router.delete('/investor-notes/:noteId', async (req, res): Promise<void> => {
  const params = api.DeleteInvestorNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid noteId is required.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('investor_notes')
    .delete()
    .eq('id', params.data.noteId)
    .eq('author_id', getRequestUser(req).id)
    .select('id')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'delete investor note');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Investor note not found or you cannot delete it.' });
    return;
  }
  res.status(204).end();
});

router.get('/investors/:investorId/follow-ups', async (req, res): Promise<void> => {
  const params = api.ListInvestorFollowUpsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid investorId is required.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('investor_follow_ups')
    .select('*')
    .eq('investor_id', params.data.investorId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) {
    sendSupabaseError(req, res, error, 'load investor follow-ups');
    return;
  }
  res.json(api.ListInvestorFollowUpsResponse.parse((data ?? []).map(toFollowUp)));
});

router.post('/investors/:investorId/follow-ups', async (req, res): Promise<void> => {
  const params = api.CreateInvestorFollowUpParams.safeParse(req.params);
  const body = api.CreateInvestorFollowUpBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: 'Enter a valid investor follow-up.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('investor_follow_ups')
    .insert({
      investor_id: params.data.investorId,
      title: body.data.title.trim(),
      due_date: body.data.dueDate ?? null,
    })
    .select('*')
    .single();
  if (error) {
    sendSupabaseError(req, res, error, 'create investor follow-up');
    return;
  }
  res.status(201).json(api.CreateInvestorFollowUpResponse.parse(toFollowUp(data)));
});

router.patch('/investor-follow-ups/:followUpId', async (req, res): Promise<void> => {
  const params = api.UpdateInvestorFollowUpParams.safeParse(req.params);
  const body = api.UpdateInvestorFollowUpBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: 'Enter valid follow-up updates.' });
    return;
  }
  const patch: Record<string, unknown> = {};
  if (body.data.title !== undefined) patch.title = body.data.title.trim();
  if (body.data.dueDate !== undefined) patch.due_date = body.data.dueDate;
  if (body.data.status !== undefined) patch.status = body.data.status;
  const { data, error } = await getRequestSupabase(req)
    .from('investor_follow_ups')
    .update(patch)
    .eq('id', params.data.followUpId)
    .select('*')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'update investor follow-up');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Follow-up not found or you do not have access.' });
    return;
  }
  res.json(api.UpdateInvestorFollowUpResponse.parse(toFollowUp(data)));
});

router.delete('/investor-follow-ups/:followUpId', async (req, res): Promise<void> => {
  const params = api.DeleteInvestorFollowUpParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid followUpId is required.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('investor_follow_ups')
    .delete()
    .eq('id', params.data.followUpId)
    .select('id')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'delete investor follow-up');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Follow-up not found or you do not have access.' });
    return;
  }
  res.status(204).end();
});

export default router;
