create extension if not exists "pgcrypto";

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price numeric(10,2) not null default 0,
  duration_days integer not null default 30,
  features jsonb not null default '["Gym Access"]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text not null unique,
  address text,
  emergency_contact text,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  plan_id uuid references plans(id) on delete set null,
  join_date date not null default current_date,
  expiry_date date,
  notes text,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  plan_id uuid references plans(id) on delete set null,
  start_date date not null,
  end_date date,
  status text not null default 'Active' check (status in ('Active', 'Expired', 'Cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  attendance_date date not null default current_date,
  status text not null default 'Present' check (status in ('Present', 'Absent')),
  created_at timestamptz not null default now(),
  unique(member_id, attendance_date)
);

create table if not exists admin_attendance (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  admin_name text not null,
  attendance_date date not null default current_date,
  status text not null default 'Present' check (status in ('Present', 'Absent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(admin_email, attendance_date)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  amount numeric(10,2) not null,
  status text not null default 'Paid' check (status in ('Paid', 'Pending', 'Failed')),
  payment_date date not null default current_date,
  due_date date,
  method text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- NEW: loyalty_offers table for gym renewal reward offers
create table if not exists loyalty_offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  offer_type text not null check (offer_type in ('percentage', 'fixed')),
  amount numeric(10,2) not null default 0,
  interval_unit text not null check (interval_unit in ('days', 'months', 'years')),
  interval_value integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- NEW: member_rewards table to track reward availing per member
create table if not exists member_rewards (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  offer_id uuid not null references loyalty_offers(id) on delete cascade,
  availed_at timestamptz not null default now(),
  next_due_at timestamptz,
  created_at timestamptz not null default now()
);

insert into plans (name, price, duration_days, features)
values
  ('Basic', 1500, 30, '["Gym Access", "Cardio Zone Access"]'),
  ('Standard', 3000, 180, '["Gym Access", "Diet Consultation", "Cardio Zone Access"]'),
  ('Premium', 4500, 365, '["Gym Access", "Personal Trainer", "Diet Consultation", "Cardio Zone Access"]')
on conflict (name) do nothing;

insert into settings (key, value)
values
  ('interval_date', '{"renewal_reminder_days":7,"attendance_alert_days":5}')
on conflict (key) do nothing;


create table if not exists attendance_codes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used boolean not null default false
);

create index if not exists idx_attendance_codes_code on attendance_codes(code);

create index if not exists idx_admin_attendance_email_date on admin_attendance(admin_email, attendance_date desc);


alter table loyalty_offers 
  drop constraint loyalty_offers_interval_unit_check;

alter table loyalty_offers 
  add constraint loyalty_offers_interval_unit_check 
  check (interval_unit in ('days', 'months', 'years', 'visits'));

-- ── WhatsApp Bot Tables ────────────────────────────────────────────────────────

-- Stores every unique WhatsApp contact that messages the bot
create table if not exists whatsapp_contacts (
  jid             text primary key,             -- e.g. 919876543210@c.us
  phone           text not null,                -- digits only, e.g. 919876543210
  name            text,                         -- confirmed or push-name
  name_confirmed  boolean not null default false,
  first_seen      timestamptz not null default now(),
  last_seen       timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_whatsapp_contacts_phone on whatsapp_contacts(phone);
create index if not exists idx_whatsapp_contacts_last_seen on whatsapp_contacts(last_seen desc);

-- Stores AI-generated chat summaries per contact (upserted every ~10 messages)
create table if not exists chat_crux (
  jid               text primary key references whatsapp_contacts(jid) on delete cascade,
  contact_name      text,
  summary           text,
  main_topics       jsonb  not null default '[]'::jsonb,
  asked_about       jsonb  not null default '[]'::jsonb,
  diet_preference   text   not null default 'unknown',
  joining_interest  text   not null default 'unknown'
                    check (joining_interest in ('high','medium','low','unknown')),
  joining_reason    text,
  message_count     integer not null default 0,
  updated_at        timestamptz not null default now()
);

create index if not exists idx_chat_crux_joining_interest on chat_crux(joining_interest);
create index if not exists idx_chat_crux_updated_at on chat_crux(updated_at desc);

-- Stores user feedback on bot replies (thumbs up / down)
create table if not exists bot_feedback (
  id           uuid primary key default gen_random_uuid(),
  jid          text references whatsapp_contacts(jid) on delete set null,
  contact_name text,
  sentiment    text not null check (sentiment in ('positive','negative')),
  created_at   timestamptz not null default now()
);

-- Stores token usage per AI request (tracks costs)
create table if not exists chat_tokens (
  id              uuid primary key default gen_random_uuid(),
  jid             text not null references whatsapp_contacts(jid) on delete cascade,
  contact_name    text,
  provider        text not null check (provider in ('openrouter', 'gemini')),
  model           text not null,
  input_tokens    integer not null default 0,
  output_tokens   integer not null default 0,
  total_tokens    integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists idx_chat_tokens_jid on chat_tokens(jid);
create index if not exists idx_chat_tokens_created_at on chat_tokens(created_at desc);
create index if not exists idx_chat_tokens_provider on chat_tokens(provider);
