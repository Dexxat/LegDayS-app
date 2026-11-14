-- 1) En Supabase > Authentication > Users > "Add user" crear la cuenta de la entrenadora
--    con su email y contraseña (marcar "Auto Confirm User").
-- 2) Cambiar el email de abajo por ese mismo email y ejecutar en SQL Editor.
insert into public.profiles (id, role, full_name, username, phone)
select id, 'admin', 'Entrenadora LegDay', 'entrenadora', '+54 9 11 0000-0000'
from auth.users where email = 'EMAIL-DE-LA-ENTRENADORA@ejemplo.com'
on conflict (id) do update set role = 'admin';
