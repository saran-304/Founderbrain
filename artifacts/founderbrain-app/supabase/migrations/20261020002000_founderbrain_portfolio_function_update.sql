-- Update public portfolio function to include startup idea
-- This migration extends the existing public portfolio projection

create or replace function public.get_public_founder_portfolio(p_founder_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'profile', jsonb_build_object(
      'id', profile.id,
      'displayName', coalesce(profile.display_name, 'Founder'),
      'headline', profile.headline,
      'bio', profile.bio,
      'skills', coalesce(profile.skills, array[]::text[]),
      'location', profile.location,
      'company', profile.company,
      'stage', profile.stage,
      'websiteUrl', profile.website_url,
      'startupIdea', profile.startup_idea
    ),
    'achievements', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', achievement.id,
            'title', achievement.title,
            'description', achievement.description,
            'category', achievement.category,
            'externalUrl', achievement.external_url,
            'issuedOn', achievement.issued_on,
            'createdAt', achievement.created_at,
            'updatedAt', achievement.updated_at
          )
          order by achievement.issued_on desc nulls last, achievement.created_at desc
        )
        from public.achievements as achievement
        where achievement.user_id = profile.id
      ),
      '[]'::jsonb
    )
  )
  from public.profiles as profile
  where profile.id = p_founder_id
    and profile.portfolio_is_public is true;
$$;

revoke all on function public.get_public_founder_portfolio(uuid) from public, anon;
grant execute on function public.get_public_founder_portfolio(uuid) to anon, authenticated;
