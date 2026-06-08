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

insert into plans (name, price, duration_days, features)
values
  ('Basic', 1500, 30, '["Gym Access", "Cardio Zone Access"]'),
  ('Standard', 3000, 180, '["Gym Access", "Diet Consultation", "Cardio Zone Access"]'),
  ('Premium', 4500, 365, '["Gym Access", "Personal Trainer", "Diet Consultation", "Cardio Zone Access"]')
on conflict (name) do nothing;

insert into settings (key, value)
values
  ('offer', '{"title":"Launch Offer","discount_percent":10,"active":true}'),
  ('interval_date', '{"renewal_reminder_days":7,"attendance_alert_days":5}')
on conflict (key) do nothing;
