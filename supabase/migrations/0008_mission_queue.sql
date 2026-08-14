-- Les séances générées deviennent une FILE DE MISSIONS.
-- Un planning hebdo figé met en faute dès qu'une journée de mer tombe :
-- la séance du mardi devient une dette. Une file, non — tu piochesment
-- dedans quand tu peux, et rien n'est "en retard".
alter table generated_sessions
  add column if not exists status text not null default 'pending',
  add column if not exists run_id text,
  add column if not exists priority int not null default 0,
  add column if not exists closed_at timestamptz;

-- pending : à faire · active : run en cours · done : terminée · skipped : passée
create index if not exists generated_sessions_status_idx
  on generated_sessions (status, priority desc, created_at);
