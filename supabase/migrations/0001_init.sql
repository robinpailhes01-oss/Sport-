-- ASCENT — schéma initial Supabase.
-- App mono-utilisateur, zéro auth : toutes les tables sont verrouillées par
-- Row Level Security SANS AUCUNE POLICY. Ça bloque totalement la clé publique
-- (anon/publishable) exposée dans le bundle navigateur ; seule la clé
-- service_role — jamais envoyée au client, utilisée uniquement côté serveur
-- (Server Actions Next.js) — peut lire/écrire. C'est le même principe que
-- ANTHROPIC_API_KEY pour /api/comms : le secret ne quitte jamais le serveur.

create type stat_key as enum ('force', 'engine', 'skill', 'discipline', 'mental');
create type xp_source as enum ('run', 'checkin', 'bonus', 'record');
create type run_status as enum ('rolled', 'active', 'completed', 'abandoned');
create type comms_author as enum ('me', 'goggins', 'robbins', 'oracle');

-- ============================================================
-- XP LEDGER — source de vérité unique de toute progression
-- ============================================================
create table xp_events (
  id          bigint generated always as identity primary key,
  stat        stat_key not null,
  amount      int not null,
  source      xp_source not null,
  reason      text not null,
  run_id      text,
  created_at  timestamptz not null default now()
);
create index xp_events_stat_idx on xp_events (stat, created_at);
alter table xp_events enable row level security;

-- ============================================================
-- RUNS — les templates restent statiques côté code (lib/data/seed.ts),
-- seul le déroulé (tirage, perf, verdict) est persisté.
-- ============================================================
create table runs (
  id            text primary key,
  template_id   text not null,
  status        run_status not null default 'rolled',
  modifiers     jsonb not null default '[]',
  risk_tier     int not null default 0,
  rolled_at     timestamptz not null default now(),
  started_at    timestamptz,
  completed_at  timestamptz,
  performance   jsonb,
  outcome       jsonb
);
alter table runs enable row level security;

-- ============================================================
-- RECORDS / PR
-- ============================================================
create table records (
  id            bigint generated always as identity primary key,
  movement_key  text not null,
  value         numeric not null,
  date          date not null,
  is_pr         boolean not null default false
);
create index records_movement_idx on records (movement_key, date);
alter table records enable row level security;

-- ============================================================
-- JOURS DE MER — décalent la mission, jamais le streak
-- ============================================================
create table sea_days (
  date date primary key
);
alter table sea_days enable row level security;

-- ============================================================
-- JOURNAL D'HABITUDES
-- ============================================================
create table journal_entries (
  date        date not null,
  habit_key   text not null,
  granted     boolean not null default false,
  primary key (date, habit_key)
);
alter table journal_entries enable row level security;

create table journal_validated (
  date date primary key
);
alter table journal_validated enable row level security;

-- ============================================================
-- HEURES D'ENTRAÎNEMENT DÉCLARÉES
-- ============================================================
create table training_times (
  date date primary key,
  time text not null
);
alter table training_times enable row level security;

-- ============================================================
-- ÉPARGNE
-- ============================================================
create table savings (
  id          bigint generated always as identity primary key,
  amount      numeric not null,
  date        date not null,
  created_at  timestamptz not null default now()
);
alter table savings enable row level security;

-- ============================================================
-- COMMS — fil de discussion avec les 3 agents
-- ============================================================
create table comms_messages (
  id          bigint generated always as identity primary key,
  author      comms_author not null,
  text        text not null,
  mood        int check (mood between 1 and 5),
  created_at  timestamptz not null default now()
);
create index comms_messages_created_idx on comms_messages (created_at);
alter table comms_messages enable row level security;

-- ============================================================
-- SCANS CORPORELS — photos face/profil/dos, timeline avant/après.
-- Les fichiers vivent dans le bucket Storage privé "body-scans" (créé
-- ci-dessous), jamais accessibles publiquement — uniquement via URL signée
-- générée côté serveur avec service_role.
-- ============================================================
create table body_scans (
  id            bigint generated always as identity primary key,
  date          date not null,
  angle         text not null check (angle in ('face', 'profil', 'dos')),
  storage_path  text not null,
  created_at    timestamptz not null default now()
);
create index body_scans_date_idx on body_scans (date);
alter table body_scans enable row level security;

insert into storage.buckets (id, name, public)
values ('body-scans', 'body-scans', false)
on conflict (id) do nothing;
