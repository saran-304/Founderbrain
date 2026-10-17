import { Router, type IRouter } from 'express';
import * as api from '@workspace/api-zod';
import {
  getRequestSupabase,
  getRequestUser,
  sendSupabaseError,
} from '../lib/supabase-api';

const router: IRouter = Router();

function toNotification(row: any) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    resourcePath: row.resource_path,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

function toSettings(row: any) {
  return {
    communityNotifications: row.community_notifications,
    connectionNotifications: row.connection_notifications,
    mentorshipNotifications: row.mentorship_notifications,
    updatedAt: row.updated_at,
  };
}

router.get('/notifications', async (req, res): Promise<void> => {
  const { data, error } = await getRequestSupabase(req)
    .from('notifications')
    .select('*')
    .eq('user_id', getRequestUser(req).id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    sendSupabaseError(req, res, error, 'load notifications');
    return;
  }
  res.json(api.ListNotificationsResponse.parse((data ?? []).map(toNotification)));
});

router.put('/notifications/read-all', async (req, res): Promise<void> => {
  const { error } = await getRequestSupabase(req)
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', getRequestUser(req).id)
    .is('read_at', null);
  if (error) {
    sendSupabaseError(req, res, error, 'mark notifications as read');
    return;
  }
  res.status(204).end();
});

router.put('/notifications/:notificationId/read', async (req, res): Promise<void> => {
  const params = api.MarkNotificationReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid notificationId is required.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', params.data.notificationId)
    .eq('user_id', getRequestUser(req).id)
    .select('*')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'mark notification as read');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Notification not found.' });
    return;
  }
  res.json(api.MarkNotificationReadResponse.parse(toNotification(data)));
});

router.get('/settings', async (req, res): Promise<void> => {
  const supabase = getRequestSupabase(req);
  const userId = getRequestUser(req).id;
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'load user settings');
    return;
  }
  if (data) {
    res.json(api.GetUserSettingsResponse.parse(toSettings(data)));
    return;
  }

  const { data: created, error: createError } = await supabase
    .from('user_settings')
    .insert({ user_id: userId })
    .select('*')
    .single();
  if (createError) {
    sendSupabaseError(req, res, createError, 'initialize user settings');
    return;
  }
  res.json(api.GetUserSettingsResponse.parse(toSettings(created)));
});

router.patch('/settings', async (req, res): Promise<void> => {
  const body = api.UpdateUserSettingsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: 'Enter valid notification preferences.' });
    return;
  }
  const patch: Record<string, boolean> = {};
  if (body.data.communityNotifications !== undefined) patch.community_notifications = body.data.communityNotifications;
  if (body.data.connectionNotifications !== undefined) patch.connection_notifications = body.data.connectionNotifications;
  if (body.data.mentorshipNotifications !== undefined) patch.mentorship_notifications = body.data.mentorshipNotifications;

  const { data, error } = await getRequestSupabase(req)
    .from('user_settings')
    .upsert({
      user_id: getRequestUser(req).id,
      ...patch,
    }, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) {
    sendSupabaseError(req, res, error, 'update user settings');
    return;
  }
  res.json(api.UpdateUserSettingsResponse.parse(toSettings(data)));
});

export default router;
