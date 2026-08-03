-- journal_entries représente l'état COCHÉ courant (une ligne = case cochée,
-- décocher = supprimer la ligne). Il faut une trace SÉPARÉE et permanente de
-- ce qui a déjà été crédité en XP, pour qu'un décoche/recoche ne fasse pas
-- gagner l'XP deux fois — même logique que journalGranted dans l'ancien
-- MockDataSource. La clé "__full__" y est aussi utilisée pour le bonus
-- journal complet.
alter table journal_entries drop column if exists granted;

create table journal_granted (
  date        date not null,
  habit_key   text not null,
  created_at  timestamptz not null default now(),
  primary key (date, habit_key)
);
alter table journal_granted enable row level security;

-- Reset "Zone dangereuse" (/reglages) — TRUNCATE direct, plus fiable que des
-- DELETE filtrés depuis PostgREST (chaque table a une clé primaire différente).
-- SECURITY DEFINER + search_path verrouillé : seule service_role peut
-- l'appeler (RLS bloque déjà tout le reste), et le search_path fixe empêche
-- un hijack par schéma custom.
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
    comms_messages;
$$;
