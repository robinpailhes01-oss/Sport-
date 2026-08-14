-- Analyses IA des scans corporels.
-- Stockées plutôt que recalculées : un appel vision coûte, et surtout
-- l'analyse d'un scan donné ne change pas — c'est une photo figée. On garde
-- aussi la trace pour comparer les lectures dans le temps.
create table scan_analyses (
  id            bigint generated always as identity primary key,
  /** date du scan analysé (les 3 angles d'un même jour = une analyse) */
  date          date not null unique,
  /** verdict global, 2-3 phrases */
  summary       text not null,
  /** zones visuellement développées */
  developed     jsonb not null default '[]',
  /** [{ zone, why }] — zones à travailler */
  to_work       jsonb not null default '[]',
  /** remarque posturale si visible, sinon null */
  posture       text,
  /** recoupement entre ce qui se voit et ce que disent les charges */
  cross_check   text,
  created_at    timestamptz not null default now()
);
alter table scan_analyses enable row level security;
