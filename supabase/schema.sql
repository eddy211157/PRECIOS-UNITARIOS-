-- =====================================================================
--  APU BOLIVIA · SCRIPT ÚNICO PARA SUPABASE
--  Pega TODO este texto en Supabase > SQL Editor y pulsa "Run".
--  Solo debes cambiar las 3 líneas marcadas con "<<< CAMBIA" (paso 1).
--  Puedes ejecutarlo de nuevo sin problema: no duplica nada.
-- =====================================================================

-- PASO 1: tu administrador (escribe tu correo, tu contraseña y tu nombre)
drop table if exists public.configuracion_inicial;
create table public.configuracion_inicial (correo text, clave text, nombre text);
insert into public.configuracion_inicial values (
  'admin@tuempresa.com',      -- <<< CAMBIA: tu correo
  'CambiaEstaClave123',       -- <<< CAMBIA: tu contraseña (mínimo 6 caracteres)
  'Administrador'             -- <<< CAMBIA: tu nombre
);

-- PASO 2: de aquí en adelante NO se modifica nada
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, nombre text,
  rol text not null default 'usuario' check (rol in ('admin','usuario')),
  created_at timestamptz default now()
);

create table if not exists public.proyectos (
  id uuid primary key default gen_random_uuid(),
  codigo text, nombre text, entidad text, propietario text, ubicacion text,
  departamento text, municipio text, localidad text, tipo_obra text,
  superficie numeric default 0, plantas int, plazo_dias int,
  modalidad text, financiamiento text, responsable text, version text default '1.0',
  fecha_elaboracion date default current_date, fecha_actualizacion date default current_date,
  modo_herramientas text not null default 'porcentaje' check (modo_herramientas in ('porcentaje','individual')),
  creado_por uuid default auth.uid(), created_at timestamptz default now()
);

create table if not exists public.parametros (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  clave text not null, nombre text, valor numeric, unidad text default '%',
  base text, observacion text, fecha_actualizacion date default current_date,
  unique (proyecto_id, clave)
);

create table if not exists public.impuestos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  nombre text not null, porcentaje numeric,
  base text not null default 'subtotal' check (base in ('directo','subtotal')),
  activo boolean not null default false, observacion text
);

create table if not exists public.recursos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('material','mano_obra','equipo','herramienta')),
  codigo text not null unique, familia text, descripcion text not null, unidad text,
  precio numeric, moneda text default 'Bs',
  jornal numeric, horas_jornada numeric default 8,
  combustible numeric, operador numeric, mantenimiento numeric, depreciacion numeric,
  proveedor text, fuente text, nro_documento text,
  fecha_precio date default current_date, observaciones text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists public.historial_precios (
  id uuid primary key default gen_random_uuid(),
  recurso_id uuid not null references public.recursos(id) on delete cascade,
  precio_anterior numeric, precio_actual numeric,
  fecha_anterior date, fecha_actual date,
  proveedor text, fuente text, observaciones text,
  created_at timestamptz default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  orden int default 1, capitulo text default 'Otros', codigo text, descripcion text not null,
  unidad text, cantidad numeric default 0, ubicacion text, observaciones text,
  created_at timestamptz default now()
);

create table if not exists public.apu_lineas (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  recurso_id uuid not null references public.recursos(id) on delete restrict,
  cantidad numeric default 0, rendimiento numeric default 1
);

create index if not exists i_items_proy on public.items(proyecto_id);
create index if not exists i_lineas_item on public.apu_lineas(item_id);
create index if not exists i_param_proy on public.parametros(proyecto_id);

-- Historial automático de precios
create or replace function public.registrar_historial() returns trigger
language plpgsql as $$
begin
  if new.precio is distinct from old.precio then
    insert into public.historial_precios(recurso_id, precio_anterior, precio_actual, fecha_anterior, fecha_actual, proveedor, fuente, observaciones)
    values (new.id, old.precio, new.precio, old.fecha_precio, new.fecha_precio, new.proveedor, new.fuente, new.observaciones);
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists t_historial on public.recursos;
create trigger t_historial before update on public.recursos for each row execute function public.registrar_historial();

-- Cada proyecto nuevo nace con sus parámetros e impuestos (SIN porcentajes normativos)
create or replace function public.nuevo_proyecto_defaults() returns trigger
language plpgsql as $$
begin
  insert into public.parametros(proyecto_id, clave, nombre, valor, unidad, base, observacion) values
   (new.id,'cargas_sociales','Beneficios / cargas sociales',null,'%','Costo de mano de obra','Definir y verificar según normativa laboral vigente'),
   (new.id,'iva_mo','IVA sobre mano de obra',null,'%','Mano de obra + cargas sociales','Verificar tratamiento tributario aplicable al proyecto'),
   (new.id,'herramientas_menores','Herramientas menores',null,'%','Costo de mano de obra','Definir según criterio del proponente'),
   (new.id,'gastos_generales','Gastos generales',null,'%','Costo directo','Verificar según DBC y condiciones del proyecto'),
   (new.id,'utilidad','Utilidad',null,'%','Costo directo + gastos generales','Criterio del proponente; verificar el DBC'),
   (new.id,'umbral_variacion','Alerta de variación de precios',10,'%','Variación entre precio anterior y actual','Criterio interno de alerta, editable'),
   (new.id,'dias_antiguedad','Antigüedad máxima de precios',90,'días','Fecha del precio','Criterio interno de alerta, editable');
  insert into public.impuestos(proyecto_id, nombre, porcentaje, base, activo, observacion) values
   (new.id,'Impuesto a las Transacciones (IT)',null,'subtotal',false,'Verificar si corresponde al proyecto y su porcentaje vigente'),
   (new.id,'Otro impuesto aplicable',null,'subtotal',false,'Verificar normativa tributaria vigente');
  return new;
end $$;
drop trigger if exists t_proyecto_defaults on public.proyectos;
create trigger t_proyecto_defaults after insert on public.proyectos for each row execute function public.nuevo_proyecto_defaults();

-- Seguridad: solo usuarios con sesión pueden trabajar con los datos
create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and rol = 'admin')
$$;

do $$
declare t text;
begin
  foreach t in array array['proyectos','parametros','impuestos','recursos','historial_precios','items','apu_lineas'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "acceso autenticados" on public.%I', t);
    execute format('create policy "acceso autenticados" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
alter table public.profiles enable row level security;
drop policy if exists "ver perfiles" on public.profiles;
create policy "ver perfiles" on public.profiles for select to authenticated using (true);

-- Creación de usuarios desde dentro del software (sin Edge Functions)
create or replace function public._crear_auth_user(p_email text, p_password text, p_nombre text, p_rol text)
returns uuid language plpgsql security definer set search_path = public, extensions, auth as $$
declare v_id uuid := gen_random_uuid(); v_email text := lower(trim(p_email));
begin
  if v_email is null or v_email = '' then raise exception 'Escribe un correo.'; end if;
  if length(coalesce(p_password,'')) < 6 then raise exception 'La contraseña debe tener al menos 6 caracteres.'; end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then raise exception 'Ya existe un usuario con ese correo.'; end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true), 'email', now(), now(), now());
  insert into public.profiles (id, email, nombre, rol)
  values (v_id, v_email, coalesce(nullif(p_nombre,''), v_email), case when p_rol = 'admin' then 'admin' else 'usuario' end);
  return v_id;
end $$;

create or replace function public.crear_usuario(p_email text, p_password text, p_nombre text, p_rol text)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'Solo el administrador puede crear usuarios.'; end if;
  return public._crear_auth_user(p_email, p_password, p_nombre, p_rol);
end $$;

create or replace function public.eliminar_usuario(p_id uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.es_admin() then raise exception 'Solo el administrador puede eliminar usuarios.'; end if;
  if p_id = auth.uid() then raise exception 'No puedes eliminar tu propio usuario.'; end if;
  delete from auth.users where id = p_id;
end $$;

create or replace function public.cambiar_password(p_id uuid, p_password text)
returns void language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  if not public.es_admin() then raise exception 'Solo el administrador puede cambiar contraseñas.'; end if;
  if length(coalesce(p_password,'')) < 6 then raise exception 'La contraseña debe tener al menos 6 caracteres.'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = p_id;
end $$;

revoke all on function public._crear_auth_user(text,text,text,text) from public, anon, authenticated;
revoke all on function public.crear_usuario(text,text,text,text) from public, anon;
revoke all on function public.eliminar_usuario(uuid) from public, anon;
revoke all on function public.cambiar_password(uuid,text) from public, anon;
grant execute on function public.crear_usuario(text,text,text,text) to authenticated;
grant execute on function public.eliminar_usuario(uuid) to authenticated;
grant execute on function public.cambiar_password(uuid,text) to authenticated;

-- Base inicial de recursos (SIN precios: tú los completas en el sistema)
insert into public.recursos (tipo, codigo, familia, descripcion, unidad) values
 ('material','MAT-001','Aglomerantes','Cemento portland','bolsa'),
 ('material','MAT-002','Agregados','Arena','m³'),
 ('material','MAT-003','Agregados','Grava','m³'),
 ('material','MAT-004','Agregados','Piedra','m³'),
 ('material','MAT-005','Acero','Acero corrugado','kg'),
 ('material','MAT-006','Acero','Alambre de amarre','kg'),
 ('material','MAT-007','Mampostería','Ladrillo','pza'),
 ('material','MAT-008','Mampostería','Bloque','pza'),
 ('material','MAT-009','Madera','Madera de construcción','pie²'),
 ('material','MAT-010','Cubierta','Calamina','pza'),
 ('material','MAT-011','Metálicos','Perfiles metálicos','kg'),
 ('material','MAT-012','Sanitario','Tuberías','m'),
 ('material','MAT-013','Sanitario','Accesorios sanitarios','pza'),
 ('material','MAT-014','Acabados','Pintura','lt'),
 ('material','MAT-015','Eléctrico','Material eléctrico','glb'),
 ('mano_obra','MO-001','Obra','Maestro de obra','hr'),
 ('mano_obra','MO-002','Obra','Oficial albañil','hr'),
 ('mano_obra','MO-003','Obra','Ayudante','hr'),
 ('mano_obra','MO-004','Obra','Carpintero','hr'),
 ('mano_obra','MO-005','Obra','Enfierrador','hr'),
 ('mano_obra','MO-006','Instalaciones','Electricista','hr'),
 ('mano_obra','MO-007','Instalaciones','Plomero','hr'),
 ('mano_obra','MO-008','Maquinaria','Operador de maquinaria','hr'),
 ('equipo','EQ-001','Hormigón','Mezcladora','hr'),
 ('equipo','EQ-002','Hormigón','Vibradora','hr'),
 ('equipo','EQ-003','Tierras','Compactador','hr'),
 ('equipo','EQ-004','Tierras','Retroexcavadora','hr'),
 ('equipo','EQ-005','Tierras','Excavadora','hr'),
 ('equipo','EQ-006','Transporte','Volqueta','hr'),
 ('equipo','EQ-007','Elevación','Grúa','hr'),
 ('equipo','EQ-008','Topografía','Equipo topográfico','hr')
on conflict (codigo) do nothing;

-- PASO 3: crea tu administrador y borra la tabla temporal con tu clave
do $$
declare c record;
begin
  select * into c from public.configuracion_inicial limit 1;
  if not exists (select 1 from auth.users where lower(email) = lower(trim(c.correo))) then
    perform public._crear_auth_user(c.correo, c.clave, c.nombre, 'admin');
  end if;
end $$;
drop table public.configuracion_inicial;
