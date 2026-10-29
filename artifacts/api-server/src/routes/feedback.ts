import { Router, type IRouter } from 'express';
import {
  getRequestSupabase,
  getRequestUser,
  sendSupabaseError,
} from '../lib/supabase-api';
import { createAnonymousSupabaseClient } from '../middlewares/supabase-auth';

const router: IRouter = Router();

// List published feedback (public endpoint)
router.get('/feedback', async (req, res): Promise<void> => {
  const category = req.query.category as string | undefined;
  const limit = parseInt(req.query.limit as string) || 20;

  // Use anonymous client for public endpoint
  const supabase = createAnonymousSupabaseClient();

  let query = supabase
    .from('feedback_posts')
    .select('id,author_id,message,category,status,created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 100));

  if (category && ['idea', 'bug_report', 'feature_request', 'general_feedback'].includes(category)) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    sendSupabaseError(req, res, error, 'load feedback');
    return;
  }

  // Get author display names
  const authorIds = (data ?? []).map((item) => item.author_id);
  const uniqueAuthorIds = [...new Set(authorIds)];

  let authorNames: Map<string, string> = new Map();
  if (uniqueAuthorIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id,display_name')
      .in('id', uniqueAuthorIds);

    if (!profilesError && profiles) {
      authorNames = new Map(profiles.map((p) => [p.id, p.display_name || 'Anonymous']));
    }
  }

  const feedbackWithAuthors = (data ?? []).map((item) => ({
    id: item.id,
    authorId: item.author_id,
    authorName: authorNames.get(item.author_id) || 'Anonymous',
    message: item.message,
    category: item.category,
    status: item.status,
    createdAt: item.created_at,
  }));

  res.json(feedbackWithAuthors);
});

// Create feedback (authenticated only)
router.post('/feedback', async (req, res): Promise<void> => {
  const { message, category } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({ error: 'Message is required.' });
    return;
  }

  if (message.trim().length > 2000) {
    res.status(400).json({ error: 'Message must be less than 2000 characters.' });
    return;
  }

  const validCategories = ['idea', 'bug_report', 'feature_request', 'general_feedback'];
  if (!category || !validCategories.includes(category)) {
    res.status(400).json({ error: 'Invalid category. Must be one of: idea, bug_report, feature_request, general_feedback.' });
    return;
  }

  const userId = getRequestUser(req).id;

  const { data, error } = await getRequestSupabase(req)
    .from('feedback_posts')
    .insert({
      author_id: userId,
      message: message.trim(),
      category,
      status: 'pending',
    })
    .select('id,message,category,status,created_at')
    .single();

  if (error) {
    sendSupabaseError(req, res, error, 'create feedback');
    return;
  }

  res.status(201).json(data);
});

// Delete feedback (author only)
router.delete('/feedback/:feedbackId', async (req, res): Promise<void> => {
  const feedbackId = req.params.feedbackId;
  const userId = getRequestUser(req).id;

  const { data, error } = await getRequestSupabase(req)
    .from('feedback_posts')
    .delete()
    .eq('id', feedbackId)
    .eq('author_id', userId)
    .select('id')
    .maybeSingle();

  if (error) {
    sendSupabaseError(req, res, error, 'delete feedback');
    return;
  }

  if (!data) {
    res.status(404).json({ error: 'Feedback not found or you do not have permission to delete it.' });
    return;
  }

  res.status(204).end();
});

export const publicFeedbackRouter = router;
export default router;
