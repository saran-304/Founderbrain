-- Workspace admins can change a member's role through the API, but must not
-- be able to rewrite the membership identity or move a member between teams.
revoke update on table public.workspace_members from authenticated;
grant update (role) on table public.workspace_members to authenticated;
