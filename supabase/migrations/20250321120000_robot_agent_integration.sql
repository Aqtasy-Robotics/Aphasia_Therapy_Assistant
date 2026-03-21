-- Robot bridge + LangGraph pipeline visibility (run in Supabase SQL editor or via CLI).
-- Requires session_reports and profiles to exist.

create table if not exists public.agent_pipeline_steps (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  report_id uuid references public.session_reports (id) on delete set null,
  run_id uuid not null,
  step_name text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_pipeline_steps_patient_created
  on public.agent_pipeline_steps (patient_id, created_at desc);

create index if not exists idx_agent_pipeline_steps_run
  on public.agent_pipeline_steps (run_id);

create table if not exists public.robot_ui_events (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  client_ts double precision,
  created_at timestamptz not null default now()
);

create index if not exists idx_robot_ui_events_device_created
  on public.robot_ui_events (device_id, created_at desc);

alter table public.agent_pipeline_steps enable row level security;

-- Therapists: read steps for patients assigned to them
create policy "agent_pipeline_steps_select_therapist"
  on public.agent_pipeline_steps
  for select
  using (
    exists (
      select 1
      from public.profiles pat
      where pat.id = agent_pipeline_steps.patient_id
        and pat.role = 'patient'
        and pat.selected_therapist_id = auth.uid()
    )
  );

-- Patients: read own pipeline steps
create policy "agent_pipeline_steps_select_patient"
  on public.agent_pipeline_steps
  for select
  using (patient_id = auth.uid());

-- Optional: allow authenticated inserts from edge functions; Pi uses FastAPI service role (bypasses RLS).

comment on table public.agent_pipeline_steps is 'LangGraph node trace per session run (linked to session_reports after persist).';
comment on table public.robot_ui_events is 'Kivy / execution agent UI events received by FastAPI bridge.';
