import { Router, type IRouter } from 'express';
import { GetCurrentUserResponse } from '@workspace/api-zod';
import { getRequestUser } from '../lib/supabase-api';

const router: IRouter = Router();

router.get('/auth/me', (req, res): void => {
  const user = getRequestUser(req);
  const displayName = user.user_metadata?.display_name;

  res.json(
    GetCurrentUserResponse.parse({
      id: user.id,
      email: user.email ?? null,
      displayName: typeof displayName === 'string' ? displayName : null,
    }),
  );
});

export default router;
