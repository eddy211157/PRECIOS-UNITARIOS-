# APU Bolivia · Sistema de costos, APU y presupuestos de obra

Aplicación web (React + Vite + Supabase) lista para publicar en Netlify. Funciona en computadora y celular.

## Qué necesitas
- Una cuenta gratuita en https://supabase.com
- Una cuenta gratuita en https://netlify.com
- Una cuenta gratuita en https://github.com (para que Netlify publique el sistema por ti)

## PASO 1 · Supabase (una sola vez)
1. Crea un proyecto nuevo en Supabase y espera a que termine de prepararse.
2. Abre **SQL Editor** → **New query**.
3. Abre el archivo `supabase/schema.sql`, cambia SOLO las 3 líneas marcadas con `<<< CAMBIA` (tu correo, tu contraseña y tu nombre) y pega TODO el contenido en el editor.
4. Pulsa **Run**. Debe decir "Success". Con esto se crean las tablas y tu usuario administrador.
5. (Recomendado) Ve a **Authentication → Sign In / Providers** y desactiva **Allow new users to sign up**. Así nadie puede registrarse por su cuenta; los usuarios nuevos los creas tú desde el sistema.
6. Ve a **Project Settings → API** y copia dos datos: **Project URL** y la clave **anon / publishable**.

No necesitas crear buckets: el sistema no guarda imágenes ni archivos.

## PASO 2 · Conectar el sistema (solo dos datos)
Abre el archivo `.env` y reemplaza los dos valores:
```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...tu clave pública...
```
Guarda el archivo. Nada más.

## PASO 3 · Publicar en Netlify
1. En GitHub crea un repositorio **privado** y sube todos los archivos de esta carpeta (incluido `.env`).
2. En Netlify: **Add new site → Import an existing project → GitHub** y elige ese repositorio.
3. No cambies nada (ya está configurado: comando `npm run build`, carpeta `dist`). Pulsa **Deploy**.
4. Cuando termine, abre el enlace, ingresa con el correo y la contraseña que pusiste en el script y listo.

Si prefieres hacerlo desde tu computadora con Node instalado: `npm install`, `npm run build` y arrastra la carpeta `dist` a Netlify (Sites → arrastrar y soltar).

## Cómo se usa
1. **Datos del proyecto**: crea tu proyecto.
2. **Parámetros**: define tus porcentajes (vienen vacíos a propósito; verifícalos con la normativa vigente).
3. **Materiales, Mano de obra, Equipos**: completa los precios.
4. **Cómputos y APU**: agrega ítems con su cantidad y arma el APU de cada uno.
5. **Presupuesto general** y **Resumen ejecutivo**: se calculan solos; imprime o guarda en PDF.
6. **Control y validación**: revisa el semáforo antes de entregar.
7. **Usuarios**: crea empleados o vendedores sin salir del sistema.
