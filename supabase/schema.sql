-- ============================================================
-- Queue Cure — Supabase Schema v1.0
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

create extension if not exists "uuid-ossp";

-- ───────────────────────────────────────────────────────────
-- TABLES
-- ───────────────────────────────────────────────────────────

-- Family Groups
create table if not exists family_groups (
  id           uuid        primary key default uuid_generate_v4(),
  group_name   varchar(100) not null,
  created_at   timestamptz  not null default now()
);

-- Patients (core table)
create table if not exists patients (
  id               uuid         primary key default uuid_generate_v4(),
  token_number     varchar(10)  not null,
  patient_name     varchar(100) not null,
  phone            varchar(20),
  family_group_id  uuid         references family_groups(id) on delete set null,
  status           varchar(20)  not null default 'WAITING'
                   constraint patients_status_check
                   check (status in ('WAITING','CALLED','COMPLETED','SKIPPED','CANCELLED')),
  created_at       timestamptz  not null default now(),
  called_at        timestamptz,
  completed_at     timestamptz,
  qr_access_code   varchar(20)  unique not null,
  date_created     date         not null default current_date
);

-- Clinic Settings (singleton — id always 1)
create table if not exists clinic_settings (
  id                       int  primary key default 1,
  current_token_id         uuid references patients(id) on delete set null,
  queue_paused             boolean not null default false,
  default_consultation_time int    not null default 8,
  constraint settings_singleton check (id = 1)
);

-- Queue Events (audit trail)
create table if not exists queue_events (
  id          uuid        primary key default uuid_generate_v4(),
  patient_id  uuid        references patients(id) on delete cascade,
  event_type  varchar(30) not null
              constraint queue_events_type_check
              check (event_type in ('PATIENT_ADDED','TOKEN_CALLED','COMPLETED','SKIPPED','REJOINED','CANCELLED')),
  created_at  timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────
-- SEED
-- ───────────────────────────────────────────────────────────

insert into clinic_settings (id, queue_paused, default_consultation_time)
values (1, false, 8)
on conflict (id) do nothing;

-- ───────────────────────────────────────────────────────────
-- INDEXES
-- ───────────────────────────────────────────────────────────

create index if not exists idx_patients_status        on patients(status);
create index if not exists idx_patients_date_created  on patients(date_created);
create index if not exists idx_patients_qr_code       on patients(qr_access_code);
create index if not exists idx_patients_created_at    on patients(created_at);
create index if not exists idx_events_patient_id      on queue_events(patient_id);

-- ───────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (open for hackathon demo)
-- ───────────────────────────────────────────────────────────

alter table patients        enable row level security;
alter table clinic_settings enable row level security;
alter table queue_events    enable row level security;
alter table family_groups   enable row level security;

create policy "anon_all_patients"   on patients        for all using (true) with check (true);
create policy "anon_all_settings"   on clinic_settings for all using (true) with check (true);
create policy "anon_all_events"     on queue_events    for all using (true) with check (true);
create policy "anon_all_groups"     on family_groups   for all using (true) with check (true);

-- ───────────────────────────────────────────────────────────
-- REALTIME
-- ───────────────────────────────────────────────────────────

alter publication supabase_realtime add table patients;
alter publication supabase_realtime add table clinic_settings;
