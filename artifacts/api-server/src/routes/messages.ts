import { Router, type IRouter } from 'express';
import * as api from '@workspace/api-zod';
import {
  getRequestSupabase,
  getRequestUser,
  sendSupabaseError,
} from '../lib/supabase-api';
import { requireSupabaseUser } from '../middlewares/supabase-auth';

const router: IRouter = Router();

router.use(requireSupabaseUser);

// List conversations
router.get('/messages', async (req, res): Promise<void> => {
  const supabase = getRequestSupabase(req);
  const userId = getRequestUser(req).id;

  const { data, error } = await supabase
    .from('private_messages')
    .select('*, sender:profiles!private_messages_sender_id_fkey(display_name), recipient:profiles!private_messages_recipient_id_fkey(display_name)')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    sendSupabaseError(req, res, error, 'load conversations');
    return;
  }

  const conversationsMap = new Map();
  (data ?? []).forEach((msg) => {
    const partnerId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
    if (!conversationsMap.has(partnerId)) {
      conversationsMap.set(partnerId, {
        partnerId,
        partnerName: msg.sender_id === userId ? msg.recipient?.display_name : msg.sender?.display_name,
        lastMessage: msg.content,
        updatedAt: msg.created_at,
        unreadCount: msg.read_at === null && msg.recipient_id === userId ? 1 : 0
      });
    } else if (msg.read_at === null && msg.recipient_id === userId) {
        conversationsMap.get(partnerId).unreadCount++;
    }
  });

  res.json(api.ListConversationsResponse.parse(Array.from(conversationsMap.values())));
});

// Fetch conversation history
router.get('/messages/:recipientId', async (req, res): Promise<void> => {
  const supabase = getRequestSupabase(req);
  const userId = getRequestUser(req).id;
  const recipientId = req.params.recipientId;

  // Validate connection
  const { data: connection } = await supabase
    .from('founder_connections')
    .select('id')
    .eq('status', 'accepted')
    .or(`and(requester_id.eq.${userId},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${userId})`)
    .maybeSingle();

  if (!connection) {
    res.status(403).json({ error: 'You must be connected to message this founder.' });
    return;
  }

  const { data, error } = await supabase
    .from('private_messages')
    .select('*')
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${userId})`)
    .order('created_at', { ascending: true })
    .range(0, 49); // Simple pagination

  if (error) {
    sendSupabaseError(req, res, error, 'load messages');
    return;
  }

  res.json(api.ListMessagesResponse.parse(data ?? []));
});

// Send message
router.post('/messages', async (req, res): Promise<void> => {
  const parsed = api.CreateMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid message content.' });
    return;
  }
  const { recipientId, content } = parsed.data;
  const supabase = getRequestSupabase(req);
  const userId = getRequestUser(req).id;

  if (recipientId === userId) {
      res.status(400).json({ error: 'Cannot message yourself.' });
      return;
  }

  // Validate connection
  const { data: connection } = await supabase
    .from('founder_connections')
    .select('id')
    .eq('status', 'accepted')
    .or(`and(requester_id.eq.${userId},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${userId})`)
    .maybeSingle();

  if (!connection) {
    res.status(403).json({ error: 'You must be connected to message this founder.' });
    return;
  }

  const { data, error } = await supabase
    .from('private_messages')
    .insert({ sender_id: userId, recipient_id: recipientId, content: content.trim() })
    .select('*')
    .single();

  if (error) {
    sendSupabaseError(req, res, error, 'send message');
    return;
  }

  res.status(201).json(api.CreateMessageResponse.parse(data));
});

// Mark as read
router.patch('/messages/:messageId/read', async (req, res): Promise<void> => {
  const messageId = req.params.messageId;
  const supabase = getRequestSupabase(req);
  const userId = getRequestUser(req).id;

  const { data, error } = await supabase
    .from('private_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('recipient_id', userId) // Security: ensure user is recipient
    .select('id')
    .single();

  if (error) {
    sendSupabaseError(req, res, error, 'mark message as read');
    return;
  }

  res.status(204).end();
});

export default router;
