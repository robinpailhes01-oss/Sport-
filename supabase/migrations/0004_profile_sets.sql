-- PALIER 1 — la fondation "données réelles" :
-- qui tu es (profil), combien tu pèses (pesées), et ce que tu soulèves
-- vraiment (séries). Sans ces trois tables, l'atlas corporel et les agents
-- personnalisés n'ont rien à lire.
-- Même principe RLS que le reste : verrouillé sans policy, service_role seul.

-- ── PROFIL OPÉRATEUR ── une seule ligne (app solo), id figé à 1.
create table operator_profile (
  id            int primary key default 1 check (id = 1),
  height_cm     numeric,
  birthdate     date,
  /** "gym" | "bateau" | "minimal" — conditionne les séances générées */
  equipment     text not null default 'gym',
  /** "hybride-hyrox" | "force" | "physique" */
  goal          text not null default 'hybride-hyrox',
  /** contraintes en texte libre, lues par les agents */
  constraints   text,
  /** minutes disponibles par défaut pour une séance */
  time_budget_min int not null default 60,
  updated_at    timestamptz not null default now()
);
alter table operator_profile enable row level security;

insert into operator_profile (id) values (1) on conflict (id) do nothing;

-- ── PESÉES ── une par jour max ; la tendance vaut plus que la valeur du jour.
create table weigh_ins (
  date        date primary key,
  weight_kg   numeric not null,
  created_at  timestamptz not null default now()
);
alter table weigh_ins enable row level security;

-- ── SÉRIES RÉELLES ── LA table qui alimente e1RM, tonnage par muscle et
-- toute la personnalisation des agents.
create table set_logs (
  id            bigint generated always as identity primary key,
  run_id        text,
  exercise_key  text not null,
  set_index     int not null,
  weight_kg     numeric not null,
  reps          int not null,
  rpe           int check (rpe between 1 and 10),
  date          date not null,
  created_at    timestamptz not null default now()
);
create index set_logs_exercise_idx on set_logs (exercise_key, date);
create index set_logs_run_idx on set_logs (run_id);
alter table set_logs enable row level security;

-- Le reset "Zone dangereuse" doit aussi vider les séries et les pesées, mais
-- PAS le profil (taille/objectif ne sont pas de la progression) ni les scans.
create or replace function reset_ascent_protocol()
returns void
language sql
security definer
set search_path = public
as $$
  truncate table
    xp_events,
    runs,
    records,
    sea_days,
    journal_entries,
    journal_granted,
    journal_validated,
    training_times,
    savings,
    comms_messages,
    set_logs,
    weigh_ins;
$$;
