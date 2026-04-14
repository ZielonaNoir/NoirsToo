-- Prompt Graph production tables (engineering-grade audit and eval)

create table if not exists public.prompt_graph_datasets (
  id uuid primary key default gen_random_uuid(),
  dataset text not null,
  input text not null,
  target text not null,
  rubric jsonb not null default '{}'::jsonb,
  version text not null,
  created_at timestamptz not null default now()
);

create index if not exists prompt_graph_datasets_dataset_version_idx
  on public.prompt_graph_datasets (dataset, version desc);

create table if not exists public.prompt_graph_eval_runs (
  id uuid primary key default gen_random_uuid(),
  run_id text not null,
  dataset text not null,
  provider text not null,
  prompt text not null,
  score double precision not null,
  trace_id text not null,
  tab_id integer,
  session_id text,
  eval_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists prompt_graph_eval_runs_dataset_created_idx
  on public.prompt_graph_eval_runs (dataset, created_at desc);

create table if not exists public.prompt_graph_audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  tab_id integer,
  session_id text,
  trace_id text,
  state text,
  provider text,
  latency_ms integer,
  cost_usd double precision,
  risk_flags text[] not null default '{}',
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists prompt_graph_audit_event_created_idx
  on public.prompt_graph_audit_logs (event_type, created_at desc);
