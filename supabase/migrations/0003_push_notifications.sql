-- Notifications push (Web Push) — abonnements du navigateur + dédup des
-- rappels envoyés par le cron. Même principe RLS que le reste : verrouillé
-- sans policy, seul service_role (Server Actions) y touche.

create table push_subscriptions (
  id          bigint generated always as identity primary key,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
alter table push_subscriptions enable row level security;

-- Une ligne par (date, type de rappel) déjà envoyé — empêche le cron
-- (déclenché toutes les 15 min) de spammer le même rappel plusieurs fois.
create table notification_log (
  date  date not null,
  kind  text not null,
  sent_at timestamptz not null default now(),
  primary key (date, kind)
);
alter table notification_log enable row level security;
