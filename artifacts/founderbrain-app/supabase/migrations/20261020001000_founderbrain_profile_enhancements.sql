-- Enhanced founder profile fields for co-founder matching and discovery
-- Adds fields for startup idea, collaboration preferences, and co-founder availability

alter table public.profiles
  add column if not exists looking_for_co_founder boolean,
  add column if not exists professional_interests text[] not null default '{}',
  add column if not exists collaboration_preferences text,
  add column if not exists preferred_collaboration_skills text[] not null default '{}',
  add column if not exists startup_idea text;

-- Add constraints for reasonable limits
alter table public.profiles
  add constraint professional_interests_limit check (array_length(professional_interests, 1) <= 10),
  add constraint preferred_collaboration_skills_limit check (array_length(preferred_collaboration_skills, 1) <= 10);

-- Add indexes for improved search performance
create index if not exists profiles_looking_for_co_founder_idx
  on public.profiles(looking_for_co_founder, is_discoverable)
  where looking_for_co_founder = true and is_discoverable = true;

create index if not exists profiles_stage_idx
  on public.profiles(stage, is_discoverable)
  where is_discoverable = true;

create index if not exists profiles_skills_gin_idx
  on public.profiles using gin(skills)
  where is_discoverable = true;

create index if not exists profiles_interests_gin_idx
  on public.profiles using gin(professional_interests)
  where is_discoverable = true;
