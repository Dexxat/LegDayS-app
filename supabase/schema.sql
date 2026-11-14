-- LegDay · esquema de base de datos para Supabase
-- Ejecutar completo en Supabase > SQL Editor > New query.

create extension if not exists pgcrypto;

-- Perfiles (entrenadora y alumnas). El id es el mismo que el usuario de Supabase Auth.
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('admin','alumna')),
  full_name text not null,
  username text unique not null,
  phone text,
  plan text,
  fee integer not null default 0,
  next_due date,
  active boolean not null default true,
  reminder_sent_for date,
  updated_rutina timestamptz,
  updated_dieta timestamptz,
  updated_calendario timestamptz,
  created_at timestamptz not null default now()
);

-- Rutina y dieta: un documento JSON por alumna
create table if not exists public.routines (
  student_id uuid primary key references public.profiles on delete cascade,
  data jsonb not null default '{"days":[]}',
  updated_at timestamptz not null default now()
);
create table if not exists public.diets (
  student_id uuid primary key references public.profiles on delete cascade,
  data jsonb not null default '{"kcal":"","protein":"","notes":"","meals":[]}',
  updated_at timestamptz not null default now()
);

-- Calendario semanal (1 = lunes ... 6 = sábado)
create table if not exists public.slots (
  id uuid primary key default gen_random_uuid(),
  day smallint not null check (day between 1 and 6),
  start_time time not null,
  end_time time not null check (end_time > start_time),
  title text not null,
  for_all boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.slot_students (
  slot_id uuid references public.slots on delete cascade,
  student_id uuid references public.profiles on delete cascade,
  primary key (slot_id, student_id)
);

-- Pagos (ganancias)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles on delete set null,
  amount integer not null check (amount >= 0),
  paid_on date not null,
  method text not null default 'Transferencia',
  created_at timestamptz not null default now()
);
create index if not exists payments_paid_on_idx on public.payments (paid_on);

-- Historial de WhatsApp
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles on delete set null,
  type text not null,
  body text not null,
  status text not null default 'sent',
  wa_message_id text,
  error text,
  created_at timestamptz not null default now()
);

-- Feriados (no cuentan como días hábiles para el recordatorio de cuota)
create table if not exists public.holidays (
  day date primary key,
  name text not null
);

-- ¿El usuario actual es la entrenadora?
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Seguridad por filas: cada alumna ve solo lo suyo; la entrenadora ve todo.
alter table public.profiles enable row level security;
alter table public.routines enable row level security;
alter table public.diets enable row level security;
alter table public.slots enable row level security;
alter table public.slot_students enable row level security;
alter table public.payments enable row level security;
alter table public.messages enable row level security;
alter table public.holidays enable row level security;

drop policy if exists "perfil propio o admin" on public.profiles;
create policy "perfil propio o admin" on public.profiles for select using (id = auth.uid() or public.is_admin());

drop policy if exists "rutina propia o admin" on public.routines;
create policy "rutina propia o admin" on public.routines for select using (student_id = auth.uid() or public.is_admin());

drop policy if exists "dieta propia o admin" on public.diets;
create policy "dieta propia o admin" on public.diets for select using (student_id = auth.uid() or public.is_admin());

drop policy if exists "horarios visibles" on public.slots;
create policy "horarios visibles" on public.slots for select using (
  public.is_admin() or for_all or exists (
    select 1 from public.slot_students ss where ss.slot_id = slots.id and ss.student_id = auth.uid()));

drop policy if exists "asignacion propia o admin" on public.slot_students;
create policy "asignacion propia o admin" on public.slot_students for select using (student_id = auth.uid() or public.is_admin());

drop policy if exists "pagos propios o admin" on public.payments;
create policy "pagos propios o admin" on public.payments for select using (student_id = auth.uid() or public.is_admin());

drop policy if exists "mensajes solo admin" on public.messages;
create policy "mensajes solo admin" on public.messages for select using (public.is_admin());

drop policy if exists "feriados lectura" on public.holidays;
create policy "feriados lectura" on public.holidays for select using (auth.uid() is not null);

-- Las escrituras se hacen desde el servidor con la clave de servicio,
-- después de verificar que quien pide el cambio es la entrenadora.

-- Feriados nacionales de ejemplo: revisá y completá con el calendario oficial
-- (argentina.gob.ar/interior/feriados) cada año.
insert into public.holidays (day, name) values
  ('2026-12-08','Inmaculada Concepción de María'),
  ('2026-12-25','Navidad'),
  ('2027-01-01','Año Nuevo')
on conflict (day) do nothing;

-- ===================== Biblioteca de ejercicios =====================
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  zone text not null,
  muscles text,
  equipment text,
  level text,
  steps jsonb not null default '[]',
  mistakes jsonb not null default '[]',
  media_path text,
  media_type text check (media_type in ('video','image')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists exercises_name_key on public.exercises (lower(name));
alter table public.exercises enable row level security;
drop policy if exists "ejercicios lectura" on public.exercises;
create policy "ejercicios lectura" on public.exercises for select using (auth.uid() is not null);

-- Carpeta de archivos para las animaciones (lectura pública, escritura solo desde el servidor)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ejercicios', 'ejercicios', true, 52428800, array['video/mp4','video/webm','image/gif','image/webp','image/png'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
