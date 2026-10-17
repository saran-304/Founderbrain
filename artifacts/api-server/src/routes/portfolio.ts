import { Router, type IRouter } from 'express';
import * as api from '@workspace/api-zod';
import {
  createAnonymousSupabaseClient,
  SUPABASE_SETUP_ERROR,
} from '../middlewares/supabase-auth';
import {
  getRequestSupabase,
  getRequestUser,
  sendSupabaseError,
} from '../lib/supabase-api';

const router: IRouter = Router();
export const publicPortfolioRouter: IRouter = Router();

function toAchievement(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    externalUrl: row.external_url,
    issuedOn: row.issued_on,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

publicPortfolioRouter.get('/founders/:founderId/portfolio', async (req, res): Promise<void> => {
  const params = api.GetFounderPortfolioParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid founderId is required.' });
    return;
  }
  let supabase;
  try {
    supabase = createAnonymousSupabaseClient();
  } catch {
    res.status(503).json({ error: SUPABASE_SETUP_ERROR });
    return;
  }

  const { data, error } = await supabase.rpc('get_public_founder_portfolio', {
    p_founder_id: params.data.founderId,
  });
  if (error) {
    if (error.code === 'PGRST202') {
      req.log.error(
        { code: error.code },
        'Public founder portfolio function is not available in the connected database',
      );
      res.status(503).json({
        error: 'Public portfolios are not configured in the connected database yet.',
      });
      return;
    }
    sendSupabaseError(req, res, error, 'load founder portfolio');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'This founder portfolio is private or unavailable.' });
    return;
  }
  const response = api.GetFounderPortfolioResponse.safeParse(data);
  if (!response.success) {
    req.log.error(
      { issueCount: response.error.issues.length },
      'Public founder portfolio response did not match its schema',
    );
    res.status(500).json({ error: 'Unable to load this founder portfolio.' });
    return;
  }
  res.json(response.data);
});

router.get('/portfolio/me/achievements', async (req, res): Promise<void> => {
  const { data, error } = await getRequestSupabase(req)
    .from('achievements')
    .select('*')
    .eq('user_id', getRequestUser(req).id)
    .order('issued_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) {
    sendSupabaseError(req, res, error, 'load founder achievements');
    return;
  }
  res.json(api.ListMyAchievementsResponse.parse((data ?? []).map(toAchievement)));
});

router.post('/portfolio/me/achievements', async (req, res): Promise<void> => {
  const body = api.CreateAchievementBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: 'Enter a valid achievement.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('achievements')
    .insert({
      user_id: getRequestUser(req).id,
      title: body.data.title.trim(),
      description: body.data.description?.trim() || null,
      category: body.data.category?.trim() || null,
      external_url: body.data.externalUrl ?? null,
      issued_on: body.data.issuedOn ?? null,
    })
    .select('*')
    .single();
  if (error) {
    sendSupabaseError(req, res, error, 'create achievement');
    return;
  }
  res.status(201).json(api.CreateAchievementResponse.parse(toAchievement(data)));
});

router.patch('/portfolio/achievements/:achievementId', async (req, res): Promise<void> => {
  const params = api.UpdateAchievementParams.safeParse(req.params);
  const body = api.UpdateAchievementBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: 'Enter a valid achievement update.' });
    return;
  }
  const patch: Record<string, unknown> = {};
  if (body.data.title !== undefined) patch.title = body.data.title.trim();
  if (body.data.description !== undefined) patch.description = body.data.description?.trim() || null;
  if (body.data.category !== undefined) patch.category = body.data.category?.trim() || null;
  if (body.data.externalUrl !== undefined) patch.external_url = body.data.externalUrl;
  if (body.data.issuedOn !== undefined) patch.issued_on = body.data.issuedOn;

  const { data, error } = await getRequestSupabase(req)
    .from('achievements')
    .update(patch)
    .eq('id', params.data.achievementId)
    .eq('user_id', getRequestUser(req).id)
    .select('*')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'update achievement');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Achievement not found or you cannot edit it.' });
    return;
  }
  res.json(api.UpdateAchievementResponse.parse(toAchievement(data)));
});

router.delete('/portfolio/achievements/:achievementId', async (req, res): Promise<void> => {
  const params = api.DeleteAchievementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid achievementId is required.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('achievements')
    .delete()
    .eq('id', params.data.achievementId)
    .eq('user_id', getRequestUser(req).id)
    .select('id')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'delete achievement');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Achievement not found or you cannot delete it.' });
    return;
  }
  res.status(204).end();
});

export default router;
