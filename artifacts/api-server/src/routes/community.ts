import { Router, type IRouter } from 'express';
import * as api from '@workspace/api-zod';
import {
  getRequestSupabase,
  getRequestUser,
  sendSupabaseError,
} from '../lib/supabase-api';

const router: IRouter = Router();

function toComment(row: any) {
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    authorName: row.author_name,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function currentDisplayName(req: Parameters<typeof getRequestSupabase>[0]) {
  const userId = getRequestUser(req).id;
  const { data, error } = await getRequestSupabase(req)
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.display_name || 'Founder';
}

router.get('/community/posts', async (req, res): Promise<void> => {
  const parsed = api.ListCommunityPostsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a valid post limit.' });
    return;
  }
  const supabase = getRequestSupabase(req);
  const userId = getRequestUser(req).id;
  const { data, error } = await supabase
    .from('community_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(parsed.data.limit ?? 20);
  if (error) {
    sendSupabaseError(req, res, error, 'load community posts');
    return;
  }
  const postIds = (data ?? []).map((post) => post.id);
  if (postIds.length === 0) {
    res.json(api.ListCommunityPostsResponse.parse([]));
    return;
  }

  const [{ data: comments, error: commentsError }, { data: reactions, error: reactionsError }] = await Promise.all([
    supabase.from('community_comments').select('post_id').in('post_id', postIds),
    supabase.from('community_reactions').select('post_id,user_id,reaction').in('post_id', postIds),
  ]);
  if (commentsError || reactionsError) {
    sendSupabaseError(req, res, commentsError ?? reactionsError!, 'load community post activity');
    return;
  }
  const commentCounts = new Map<string, number>();
  for (const comment of comments ?? []) commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) ?? 0) + 1);
  const postReactions = new Map<string, any[]>();
  for (const reaction of reactions ?? []) {
    const items = postReactions.get(reaction.post_id) ?? [];
    items.push(reaction);
    postReactions.set(reaction.post_id, items);
  }

  res.json(api.ListCommunityPostsResponse.parse((data ?? []).map((post) => {
    const postReactionRows = postReactions.get(post.id) ?? [];
    return {
      id: post.id,
      authorId: post.author_id,
      authorName: post.author_name,
      content: post.content,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      reactionCount: postReactionRows.length,
      commentCount: commentCounts.get(post.id) ?? 0,
      viewerReaction: postReactionRows.find((reaction) => reaction.user_id === userId)?.reaction ?? null,
    };
  })));
});

router.post('/community/posts', async (req, res): Promise<void> => {
  const body = api.CreateCommunityPostBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: 'Write a post between 1 and 5,000 characters.' });
    return;
  }
  let authorName: string;
  try {
    authorName = await currentDisplayName(req);
  } catch (profileError) {
    sendSupabaseError(req, res, profileError as { code?: string }, 'load founder profile');
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('community_posts')
    .insert({ author_id: getRequestUser(req).id, author_name: authorName, content: body.data.content.trim() })
    .select('*')
    .single();
  if (error) {
    sendSupabaseError(req, res, error, 'create community post');
    return;
  }
  res.status(201).json(api.CreateCommunityPostResponse.parse({
    id: data.id,
    authorId: data.author_id,
    authorName: data.author_name,
    content: data.content,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    reactionCount: 0,
    commentCount: 0,
    viewerReaction: null,
  }));
});

router.patch('/community/posts/:postId', async (req, res): Promise<void> => {
  const params = api.UpdateCommunityPostParams.safeParse(req.params);
  const body = api.UpdateCommunityPostBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: 'Enter a valid post update.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('community_posts')
    .update({ content: body.data.content.trim() })
    .eq('id', params.data.postId)
    .eq('author_id', getRequestUser(req).id)
    .select('*')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'update community post');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Post not found or you cannot edit it.' });
    return;
  }
  const supabase = getRequestSupabase(req);
  const userId = getRequestUser(req).id;
  const [
    { count: commentCount, error: commentsError },
    { count: reactionCount, error: reactionsError },
    { data: viewerReaction, error: viewerReactionError },
  ] = await Promise.all([
    supabase.from('community_comments').select('id', { count: 'exact', head: true }).eq('post_id', data.id),
    supabase.from('community_reactions').select('id', { count: 'exact', head: true }).eq('post_id', data.id),
    supabase.from('community_reactions').select('reaction').eq('post_id', data.id).eq('user_id', userId).maybeSingle(),
  ]);
  if (commentsError || reactionsError || viewerReactionError) {
    sendSupabaseError(req, res, commentsError ?? reactionsError ?? viewerReactionError!, 'load updated post activity');
    return;
  }
  res.json(api.UpdateCommunityPostResponse.parse({
    id: data.id,
    authorId: data.author_id,
    authorName: data.author_name,
    content: data.content,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    reactionCount: reactionCount ?? 0,
    commentCount: commentCount ?? 0,
    viewerReaction: viewerReaction?.reaction ?? null,
  }));
});

router.delete('/community/posts/:postId', async (req, res): Promise<void> => {
  const params = api.DeleteCommunityPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid postId is required.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('community_posts')
    .delete()
    .eq('id', params.data.postId)
    .eq('author_id', getRequestUser(req).id)
    .select('id')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'delete community post');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Post not found or you cannot delete it.' });
    return;
  }
  res.status(204).end();
});

router.get('/community/posts/:postId/comments', async (req, res): Promise<void> => {
  const params = api.ListCommunityCommentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid postId is required.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('community_comments')
    .select('*')
    .eq('post_id', params.data.postId)
    .order('created_at', { ascending: true });
  if (error) {
    sendSupabaseError(req, res, error, 'load community comments');
    return;
  }
  res.json(api.ListCommunityCommentsResponse.parse((data ?? []).map(toComment)));
});

router.post('/community/posts/:postId/comments', async (req, res): Promise<void> => {
  const params = api.CreateCommunityCommentParams.safeParse(req.params);
  const body = api.CreateCommunityCommentBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: 'Write a comment between 1 and 2,000 characters.' });
    return;
  }
  const supabase = getRequestSupabase(req);
  const { data: post, error: postError } = await supabase
    .from('community_posts')
    .select('id')
    .eq('id', params.data.postId)
    .maybeSingle();
  if (postError) {
    sendSupabaseError(req, res, postError, 'check community post');
    return;
  }
  if (!post) {
    res.status(404).json({ error: 'Post not found.' });
    return;
  }
  let authorName: string;
  try {
    authorName = await currentDisplayName(req);
  } catch (profileError) {
    sendSupabaseError(req, res, profileError as { code?: string }, 'load founder profile');
    return;
  }
  const { data, error } = await supabase
    .from('community_comments')
    .insert({
      post_id: params.data.postId,
      author_id: getRequestUser(req).id,
      author_name: authorName,
      content: body.data.content.trim(),
    })
    .select('*')
    .single();
  if (error) {
    sendSupabaseError(req, res, error, 'create community comment');
    return;
  }
  res.status(201).json(api.CreateCommunityCommentResponse.parse(toComment(data)));
});

router.patch('/community/comments/:commentId', async (req, res): Promise<void> => {
  const params = api.UpdateCommunityCommentParams.safeParse(req.params);
  const body = api.UpdateCommunityCommentBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: 'Enter a valid comment update.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('community_comments')
    .update({ content: body.data.content.trim() })
    .eq('id', params.data.commentId)
    .eq('author_id', getRequestUser(req).id)
    .select('*')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'update community comment');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Comment not found or you cannot edit it.' });
    return;
  }
  res.json(api.UpdateCommunityCommentResponse.parse(toComment(data)));
});

router.delete('/community/comments/:commentId', async (req, res): Promise<void> => {
  const params = api.DeleteCommunityCommentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid commentId is required.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('community_comments')
    .delete()
    .eq('id', params.data.commentId)
    .eq('author_id', getRequestUser(req).id)
    .select('id')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'delete community comment');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Comment not found or you cannot delete it.' });
    return;
  }
  res.status(204).end();
});

router.put('/community/posts/:postId/reaction', async (req, res): Promise<void> => {
  const params = api.SetCommunityReactionParams.safeParse(req.params);
  const body = api.SetCommunityReactionBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: 'Choose a valid reaction.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('community_reactions')
    .upsert({
      post_id: params.data.postId,
      user_id: getRequestUser(req).id,
      reaction: body.data.reaction,
    }, { onConflict: 'post_id,user_id' })
    .select('id,post_id,user_id,reaction')
    .single();
  if (error) {
    sendSupabaseError(req, res, error, 'set community reaction');
    return;
  }
  res.json(api.SetCommunityReactionResponse.parse({
    id: data.id,
    postId: data.post_id,
    userId: data.user_id,
    reaction: data.reaction,
  }));
});

router.delete('/community/posts/:postId/reaction', async (req, res): Promise<void> => {
  const params = api.DeleteCommunityReactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid postId is required.' });
    return;
  }
  const { error } = await getRequestSupabase(req)
    .from('community_reactions')
    .delete()
    .eq('post_id', params.data.postId)
    .eq('user_id', getRequestUser(req).id);
  if (error) {
    sendSupabaseError(req, res, error, 'remove community reaction');
    return;
  }
  res.status(204).end();
});

export default router;
