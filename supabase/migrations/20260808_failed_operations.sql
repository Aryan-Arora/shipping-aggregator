-- Durable retry queue for courier API calls that failed even after
-- withRetry's inline exponential backoff (see api/src/jobs/retryQueue.ts).
create table failed_operations (
  id uuid primary key default gen_random_uuid(),
  operation_type text not null,
  courier_code text not null,
  awb text,
  payload jsonb default '{}'::jsonb,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  last_error text,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index failed_operations_status_idx on failed_operations (status);
