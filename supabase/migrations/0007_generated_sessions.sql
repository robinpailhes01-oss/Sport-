-- Séances générées par les agents.
-- Stockées au format WorkoutTemplate pour que l'écran de run existant les
-- lise sans aucune modification : une séance générée est un template comme
-- un autre, simplement né d'un raisonnement plutôt que du code.
create table generated_sessions (
  id          text primary key,
  date        date not null,
  /** le WorkoutTemplate complet, sérialisé */
  template    jsonb not null,
  /** pourquoi cette séance aujourd'hui — affiché avant de lancer */
  rationale   text not null,
  /** coach qui signe : goggins | robbins */
  author      text not null,
  created_at  timestamptz not null default now()
);
create index generated_sessions_date_idx on generated_sessions (date desc);
alter table generated_sessions enable row level security;
