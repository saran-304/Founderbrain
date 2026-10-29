import { Router, type IRouter } from 'express';
import * as api from '@workspace/api-zod';
import {
  getRequestSupabase,
  getRequestUser,
  sendSupabaseError,
} from '../lib/supabase-api';

const router: IRouter = Router();

async function displayName(req: Parameters<typeof getRequestSupabase>[0], userId: string) {
  const { data, error } = await getRequestSupabase(req)
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.display_name || 'Founder';
}

function toQuestion(row: any, answerCount: number) {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    title: row.title,
    body: row.body,
    tags: row.tags ?? [],
    acceptedAnswerId: row.accepted_answer_id,
    answerCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAnswer(row: any, acceptedAnswerId: string | null) {
  return {
    id: row.id,
    questionId: row.question_id,
    authorId: row.author_id,
    authorName: row.author_name,
    body: row.body,
    accepted: row.id === acceptedAnswerId,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/mentorship/questions', async (req, res): Promise<void> => {
  const parsed = api.ListMentorshipQuestionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a valid question limit.' });
    return;
  }
  const supabase = getRequestSupabase(req);
  const { data, error } = await supabase
    .from('mentorship_questions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(parsed.data.limit ?? 20);
  if (error) {
    sendSupabaseError(req, res, error, 'load mentorship questions');
    return;
  }
  const ids = (data ?? []).map((question) => question.id);
  if (ids.length === 0) {
    res.json(api.ListMentorshipQuestionsResponse.parse([]));
    return;
  }
  const { data: answers, error: answerError } = await supabase
    .from('mentorship_answers')
    .select('question_id')
    .in('question_id', ids);
  if (answerError) {
    sendSupabaseError(req, res, answerError, 'count mentorship answers');
    return;
  }
  const counts = new Map<string, number>();
  for (const answer of answers ?? []) counts.set(answer.question_id, (counts.get(answer.question_id) ?? 0) + 1);
  res.json(api.ListMentorshipQuestionsResponse.parse((data ?? []).map((question) =>
    toQuestion(question, counts.get(question.id) ?? 0))));
});

router.post('/mentorship/questions', async (req, res): Promise<void> => {
  const body = api.CreateMentorshipQuestionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: 'Enter a valid question and optional tags.' });
    return;
  }
  const userId = getRequestUser(req).id;
  let authorName: string;
  try {
    authorName = await displayName(req, userId);
  } catch (profileError) {
    sendSupabaseError(req, res, profileError as { code?: string }, 'load founder profile');
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('mentorship_questions')
    .insert({
      author_id: userId,
      author_name: authorName,
      title: body.data.title.trim(),
      body: body.data.body.trim(),
      tags: body.data.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [],
    })
    .select('*')
    .single();
  if (error) {
    sendSupabaseError(req, res, error, 'create mentorship question');
    return;
  }
  res.status(201).json(api.CreateMentorshipQuestionResponse.parse(toQuestion(data, 0)));
});

router.patch('/mentorship/questions/:questionId', async (req, res): Promise<void> => {
  const params = api.UpdateMentorshipQuestionParams.safeParse(req.params);
  const body = api.UpdateMentorshipQuestionBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: 'Enter valid question updates.' });
    return;
  }
  const patch: Record<string, unknown> = {};
  if (body.data.title !== undefined) patch.title = body.data.title.trim();
  if (body.data.body !== undefined) patch.body = body.data.body.trim();
  if (body.data.tags !== undefined) patch.tags = body.data.tags.map((tag) => tag.trim()).filter(Boolean);
  const { data, error } = await getRequestSupabase(req)
    .from('mentorship_questions')
    .update(patch)
    .eq('id', params.data.questionId)
    .eq('author_id', getRequestUser(req).id)
    .select('*')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'update mentorship question');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Question not found or you cannot edit it.' });
    return;
  }
  const { count, error: countError } = await getRequestSupabase(req)
    .from('mentorship_answers')
    .select('id', { count: 'exact', head: true })
    .eq('question_id', data.id);
  if (countError) {
    sendSupabaseError(req, res, countError, 'count mentorship answers');
    return;
  }
  res.json(api.UpdateMentorshipQuestionResponse.parse(toQuestion(data, count ?? 0)));
});

router.delete('/mentorship/questions/:questionId', async (req, res): Promise<void> => {
  const params = api.DeleteMentorshipQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid questionId is required.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('mentorship_questions')
    .delete()
    .eq('id', params.data.questionId)
    .eq('author_id', getRequestUser(req).id)
    .select('id')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'delete mentorship question');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Question not found or you cannot delete it.' });
    return;
  }
  res.status(204).end();
});

router.get('/mentorship/questions/:questionId/answers', async (req, res): Promise<void> => {
  const params = api.ListMentorshipAnswersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid questionId is required.' });
    return;
  }
  const supabase = getRequestSupabase(req);
  const { data: question, error: questionError } = await supabase
    .from('mentorship_questions')
    .select('id,accepted_answer_id')
    .eq('id', params.data.questionId)
    .maybeSingle();
  if (questionError) {
    sendSupabaseError(req, res, questionError, 'load mentorship question');
    return;
  }
  if (!question) {
    res.status(404).json({ error: 'Question not found.' });
    return;
  }
  const { data, error } = await supabase
    .from('mentorship_answers')
    .select('*')
    .eq('question_id', params.data.questionId)
    .order('created_at', { ascending: true });
  if (error) {
    sendSupabaseError(req, res, error, 'load mentorship answers');
    return;
  }
  res.json(api.ListMentorshipAnswersResponse.parse((data ?? []).map((answer) =>
    toAnswer(answer, question.accepted_answer_id))));
});

router.post('/mentorship/questions/:questionId/answers', async (req, res): Promise<void> => {
  const params = api.CreateMentorshipAnswerParams.safeParse(req.params);
  const body = api.CreateMentorshipAnswerBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: 'Enter a valid answer.' });
    return;
  }
  const supabase = getRequestSupabase(req);
  const { data: question, error: questionError } = await supabase
    .from('mentorship_questions')
    .select('id,accepted_answer_id')
    .eq('id', params.data.questionId)
    .maybeSingle();
  if (questionError) {
    sendSupabaseError(req, res, questionError, 'load mentorship question');
    return;
  }
  if (!question) {
    res.status(404).json({ error: 'Question not found.' });
    return;
  }
  const userId = getRequestUser(req).id;
  let authorName: string;
  try {
    authorName = await displayName(req, userId);
  } catch (profileError) {
    sendSupabaseError(req, res, profileError as { code?: string }, 'load founder profile');
    return;
  }
  const { data, error } = await supabase
    .from('mentorship_answers')
    .insert({
      question_id: params.data.questionId,
      author_id: userId,
      author_name: authorName,
      body: body.data.body.trim(),
    })
    .select('*')
    .single();
  if (error) {
    sendSupabaseError(req, res, error, 'create mentorship answer');
    return;
  }
  res.status(201).json(api.CreateMentorshipAnswerResponse.parse(toAnswer(data, question.accepted_answer_id)));
});

router.patch('/mentorship/answers/:answerId', async (req, res): Promise<void> => {
  const params = api.UpdateMentorshipAnswerParams.safeParse(req.params);
  const body = api.UpdateMentorshipAnswerBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: 'Enter a valid answer update.' });
    return;
  }
  const supabase = getRequestSupabase(req);
  const { data, error } = await supabase
    .from('mentorship_answers')
    .update({ body: body.data.body.trim() })
    .eq('id', params.data.answerId)
    .eq('author_id', getRequestUser(req).id)
    .select('*')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'update mentorship answer');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Answer not found or you cannot edit it.' });
    return;
  }
  const { data: question, error: questionError } = await supabase
    .from('mentorship_questions')
    .select('accepted_answer_id')
    .eq('id', data.question_id)
    .single();
  if (questionError) {
    sendSupabaseError(req, res, questionError, 'load mentorship question');
    return;
  }
  res.json(api.UpdateMentorshipAnswerResponse.parse(toAnswer(data, question.accepted_answer_id)));
});

router.delete('/mentorship/answers/:answerId', async (req, res): Promise<void> => {
  const params = api.DeleteMentorshipAnswerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid answerId is required.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('mentorship_answers')
    .delete()
    .eq('id', params.data.answerId)
    .eq('author_id', getRequestUser(req).id)
    .select('id')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'delete mentorship answer');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Answer not found or you cannot delete it.' });
    return;
  }
  res.status(204).end();
});

router.put('/mentorship/answers/:answerId/accept', async (req, res): Promise<void> => {
  const params = api.AcceptMentorshipAnswerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid answerId is required.' });
    return;
  }
  const supabase = getRequestSupabase(req);
  const { data: answerCheck, error: checkError } = await supabase
    .from('mentorship_answers')
    .select('question_id')
    .eq('id', params.data.answerId)
    .maybeSingle();
  if (checkError) {
    sendSupabaseError(req, res, checkError, 'accept mentorship answer');
    return;
  }
  if (!answerCheck) {
    res.status(404).json({ error: 'Answer not found.' });
    return;
  }
  const { data: questionCheck, error: questionError } = await supabase
    .from('mentorship_questions')
    .select('author_id')
    .eq('id', answerCheck.question_id)
    .maybeSingle();
  if (questionError || !questionCheck || questionCheck.author_id !== getRequestUser(req).id) {
    res.status(403).json({ error: 'Only the question author can accept an answer.' });
    return;
  }
  const { error: acceptError } = await supabase.rpc('accept_mentorship_answer', {
    p_answer_id: params.data.answerId,
  });
  if (acceptError) {
    sendSupabaseError(req, res, acceptError, 'accept mentorship answer');
    return;
  }
  const { data, error } = await supabase
    .from('mentorship_answers')
    .select('*')
    .eq('id', params.data.answerId)
    .single();
  if (error) {
    sendSupabaseError(req, res, error, 'load accepted mentorship answer');
    return;
  }
  res.json(api.AcceptMentorshipAnswerResponse.parse(toAnswer(data, data.id)));
});

router.get('/mentorship/requests', async (req, res): Promise<void> => {
  const userId = getRequestUser(req).id;
  const { data, error } = await getRequestSupabase(req)
    .from('mentorship_requests')
    .select('*')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) {
    sendSupabaseError(req, res, error, 'load mentorship requests');
    return;
  }
  res.json(api.ListMentorshipRequestsResponse.parse((data ?? []).map((request) => ({
    id: request.id,
    senderId: request.sender_id,
    senderName: request.sender_name,
    recipientId: request.recipient_id,
    recipientName: request.recipient_name,
    message: request.message,
    status: request.status,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
  }))));
});

router.post('/mentorship/requests', async (req, res): Promise<void> => {
  const body = api.CreateMentorshipRequestBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: 'Enter a valid mentorship request.' });
    return;
  }
  const userId = getRequestUser(req).id;
  if (userId === body.data.recipientId) {
    res.status(400).json({ error: 'You cannot request mentorship from yourself.' });
    return;
  }
  const supabase = getRequestSupabase(req);
  const [{ data: sender, error: senderError }, { data: recipient, error: recipientError }] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle(),
    supabase.from('profiles').select('display_name,is_discoverable').eq('id', body.data.recipientId).maybeSingle(),
  ]);
  if (senderError || recipientError) {
    sendSupabaseError(req, res, senderError ?? recipientError!, 'load mentorship profiles');
    return;
  }
  if (!recipient || !recipient.is_discoverable) {
    res.status(404).json({ error: 'This founder is not currently discoverable.' });
    return;
  }
  const { data: existing, error: existingError } = await supabase
    .from('mentorship_requests')
    .select('id,status')
    .eq('sender_id', userId)
    .eq('recipient_id', body.data.recipientId)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle();
  if (existingError) {
    sendSupabaseError(req, res, existingError, 'check mentorship request');
    return;
  }
  if (existing) {
    res.status(409).json({ error: 'A pending mentorship request already exists.' });
    return;
  }

  const { data, error } = await supabase
    .from('mentorship_requests')
    .insert({
      sender_id: userId,
      sender_name: sender?.display_name || 'Founder',
      recipient_id: body.data.recipientId,
      recipient_name: recipient.display_name || 'Founder',
      message: body.data.message.trim(),
    })
    .select('*')
    .single();
  if (error) {
    sendSupabaseError(req, res, error, 'create mentorship request');
    return;
  }
  res.status(201).json(api.CreateMentorshipRequestResponse.parse({
    id: data.id,
    senderId: data.sender_id,
    senderName: data.sender_name,
    recipientId: data.recipient_id,
    recipientName: data.recipient_name,
    message: data.message,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }));
});

router.patch('/mentorship/requests/:requestId', async (req, res): Promise<void> => {
  const params = api.UpdateMentorshipRequestParams.safeParse(req.params);
  const body = api.UpdateMentorshipRequestBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: 'Enter a valid mentorship request response.' });
    return;
  }
  const supabase = getRequestSupabase(req);
  const userId = getRequestUser(req).id;
  const { data: current, error: lookupError } = await supabase
    .from('mentorship_requests')
    .select('recipient_id,status')
    .eq('id', params.data.requestId)
    .maybeSingle();
  if (lookupError) {
    sendSupabaseError(req, res, lookupError, 'load mentorship request');
    return;
  }
  if (!current) {
    res.status(404).json({ error: 'Mentorship request not found.' });
    return;
  }
  if (current.recipient_id !== userId) {
    res.status(403).json({ error: 'Only the recipient can respond to this request.' });
    return;
  }
  if (current.status !== 'pending') {
    res.status(409).json({ error: 'This request has already been answered.' });
    return;
  }
  const { data, error } = await supabase
    .from('mentorship_requests')
    .update({ status: body.data.status })
    .eq('id', params.data.requestId)
    .select('*')
    .single();
  if (error) {
    sendSupabaseError(req, res, error, 'respond to mentorship request');
    return;
  }
  res.json(api.UpdateMentorshipRequestResponse.parse({
    id: data.id,
    senderId: data.sender_id,
    senderName: data.sender_name,
    recipientId: data.recipient_id,
    recipientName: data.recipient_name,
    message: data.message,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }));
});

export default router;
