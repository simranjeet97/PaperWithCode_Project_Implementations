-- AI Poster Studio — Supabase schema
-- Run via: supabase db push (after supabase init)

-- ============================================
-- Users (mirror Clerk users for app data)
-- ============================================
create table public.users (
  id uuid primary key default gen_random_uuid(),
  clerk_id text unique not null,
  email text not null,
  name text,
  avatar_url text,
  tier text not null default 'free' check (tier in ('free', 'pro', 'lab')),
  posters_this_month int not null default 0,
  billing_period_start timestamptz not null default now(),
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_clerk_id_idx on public.users (clerk_id);
create index users_stripe_customer_id_idx on public.users (stripe_customer_id);

-- ============================================
-- Projects
-- ============================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  paper_file_url text not null,
  paper_arxiv_id text,
  paper_metadata jsonb,
  template text not null default 'cvpr-portrait',
  aspect_ratio text not null default 'A0-portrait',
  accent_color text not null default '#4f46e5',
  status text not null default 'uploading'
    check (status in ('uploading', 'ingesting', 'planning', 'drafting', 'critiquing', 'finalizing', 'completed', 'failed')),
  content_brief jsonb,
  poster_plan jsonb,
  final_draft_id uuid,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index projects_user_id_idx on public.projects (user_id);
create index projects_status_idx on public.projects (status);
create index projects_created_at_idx on public.projects (created_at desc);

-- ============================================
-- Poster Drafts
-- ============================================
create table public.poster_drafts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  turn_number int not null,
  html_content text not null,
  preview_png_url text,
  pdf_url text,
  critic_feedback jsonb,
  score numeric(4, 2),
  accepted boolean not null default false,
  duration_ms int,
  created_at timestamptz not null default now(),
  unique (project_id, turn_number)
);

create index poster_drafts_project_id_idx on public.poster_drafts (project_id);
create index poster_drafts_accepted_idx on public.poster_drafts (project_id, accepted);

alter table public.projects
  add constraint projects_final_draft_fk
  foreign key (final_draft_id) references public.poster_drafts (id);

-- ============================================
-- Agent Events (audit log for "Why this design?")
-- ============================================
create table public.agent_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  run_id text not null,
  stage text not null
    check (stage in ('reading', 'extracting', 'planning', 'rendering', 'critique', 'done')),
  message text not null,
  detail text,
  draft_number int,
  timestamp timestamptz not null default now()
);

create index agent_events_project_id_idx on public.agent_events (project_id, timestamp);

-- ============================================
-- Poster Reasoning (drives "Why this design?")
-- ============================================
create table public.poster_reasoning (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  panel_id text not null,
  explanation text not null,
  source_turn int not null,
  source_critic text,
  created_at timestamptz not null default now()
);

create index poster_reasoning_project_id_idx on public.poster_reasoning (project_id);

-- ============================================
-- Usage tracking (for tier limits)
-- ============================================
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  event_type text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index usage_events_user_id_idx on public.usage_events (user_id, created_at desc);

-- ============================================
-- Shared public posters (for /examples + share links)
-- ============================================
create table public.shared_posters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  slug text unique not null,
  title text not null,
  field text,
  preview_url text not null,
  poster_url text not null,
  view_count int not null default 0,
  published_at timestamptz not null default now()
);

create index shared_posters_slug_idx on public.shared_posters (slug);

-- ============================================
-- Row-level security
-- ============================================
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.poster_drafts enable row level security;
alter table public.agent_events enable row level security;
alter table public.poster_reasoning enable row level security;
alter table public.usage_events enable row level security;
alter table public.shared_posters enable row level security;

-- Users: can read/update only their own row
create policy "users self select" on public.users
  for select using (clerk_id = auth.jwt() ->> 'sub');
create policy "users self update" on public.users
  for update using (clerk_id = auth.jwt() ->> 'sub');

-- Projects: user owns their own
create policy "projects self select" on public.projects
  for select using (
    user_id in (select id from public.users where clerk_id = auth.jwt() ->> 'sub')
  );
create policy "projects self insert" on public.projects
  for insert with check (
    user_id in (select id from public.users where clerk_id = auth.jwt() ->> 'sub')
  );
create policy "projects self update" on public.projects
  for update using (
    user_id in (select id from public.users where clerk_id = auth.jwt() ->> 'sub')
  );

-- Drafts + events + reasoning: inherit from project ownership
create policy "drafts project select" on public.poster_drafts
  for select using (
    project_id in (
      select p.id from public.projects p
      join public.users u on u.id = p.user_id
      where u.clerk_id = auth.jwt() ->> 'sub'
    )
  );

create policy "agent events project select" on public.agent_events
  for select using (
    project_id in (
      select p.id from public.projects p
      join public.users u on u.id = p.user_id
      where u.clerk_id = auth.jwt() ->> 'sub'
    )
  );

create policy "reasoning project select" on public.poster_reasoning
  for select using (
    project_id in (
      select p.id from public.projects p
      join public.users u on u.id = p.user_id
      where u.clerk_id = auth.jwt() ->> 'sub')
);

-- Shared posters: world-readable
create policy "shared posters public read" on public.shared_posters
  for select using (true);