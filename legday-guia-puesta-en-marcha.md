# LegDay · plataforma de seguimiento

Web para la entrenadora y sus alumnas: acceso con usuario y contraseña, calendario semanal, rutinas, dietas, biblioteca de ejercicios con animaciones, PDF descargable, ganancias y avisos automáticos por WhatsApp.

**Tecnología:** Next.js 14 (web) · Supabase (usuarios y base de datos) · WhatsApp Cloud API de Meta (mensajes) · Vercel (hosting y tarea diaria) · dominio propio `.com.ar`.

## Qué hace

| Perfil | Funciones |
|---|---|
| Entrenadora (`/admin`) | Alta y edición de alumnas (usuario, contraseña, WhatsApp, cuota, vencimiento). Calendario semanal. Editor de rutinas y dietas, con opción de aplicar el mismo cambio a varias alumnas. Biblioteca de ejercicios: nombre, zona, músculos, equipo, nivel, técnica paso a paso, errores comunes y animación. Ganancias: pagos por mes, esperado vs. cobrado, gráfico de 6 meses, exportación a CSV. Historial de avisos. |
| Alumna (`/mi-panel`) | Sus horarios, rutina, dieta y estado de cuota. Sector **Ejercicios** con buscador, filtro por zona y ficha de cada ejercicio con su animación; desde la rutina abre la ficha con “Ver técnica y animación”. Descarga de PDF: rutina, dieta o ambos. Marca “nuevo” cuando la entrenadora actualiza algo. |
| Automático | Cada vez que se guarda una rutina, dieta u horario, la alumna recibe un WhatsApp. Todos los días a las 9:00 se envía el recordatorio a quien vence en 2 días hábiles (sin contar sábados, domingos ni feriados cargados). Al registrar un pago, el vencimiento se corre un mes y llega la confirmación. |

## Puesta en marcha (una sola vez)

### 1. Comprar el dominio
1. Entrar a **nic.ar** con Mi Argentina (necesita CUIT/CUIL y clave fiscal) y registrar, por ejemplo, `legday.com.ar`. El registro se renueva cada año.
2. Si preferís un `.com`, cualquier registrador sirve (Namecheap, Porkbun, Cloudflare).

### 2. Crear la base de datos (Supabase)
1. Crear cuenta en **supabase.com** → *New project* (región São Paulo, la más cercana).
2. *SQL Editor* → pegar y ejecutar `supabase/schema.sql`.
3. *Authentication → Providers → Email*: desactivar “Confirm email” y “Allow new users to sign up” (solo la entrenadora crea cuentas).
4. *Authentication → Users → Add user*: crear la cuenta de la entrenadora con su email y contraseña.
5. Editar el email en `supabase/crear-entrenadora.sql` y ejecutarlo. La entrenadora ya puede ingresar con su email.
6. (Opcional) Ejecutar `supabase/ejercicios-ejemplo.sql` para arrancar la biblioteca con 12 ejercicios.
7. Completar la tabla `holidays` con los feriados del año (*Table Editor*).
8. Copiar de *Project Settings → API*: URL, `anon key` y `service_role key`.

### 3. Configurar WhatsApp (Meta)
1. Crear una cuenta en **business.facebook.com** y verificar el negocio.
2. En **developers.facebook.com** → *Crear app* → tipo *Business* → agregar el producto **WhatsApp**.
3. Agregar un número propio. Tiene que ser un número que **no** esté usando la app de WhatsApp (puede ser una línea nueva o un chip aparte).
4. En *WhatsApp Manager → Plantillas*, crear estas 4 plantillas, categoría **Utilidad**, idioma **Español (ARG)**. El texto tiene que respetar el orden de las variables:

| Nombre | Texto |
|---|---|
| `legday_actualizacion` | Hola {{1}}! {{2}} en LegDay fue actualizada. Entrá a {{3}} para verla. |
| `legday_recordatorio_cuota` | Hola {{1}}! Te recordamos que tu cuota de LegDay ({{2}}) vence el {{3}}. ¡Gracias! |
| `legday_pago_recibido` | Hola {{1}}! Recibimos tu pago de {{2}}. Tu próximo vencimiento es el {{3}}. ¡Gracias! |
| `legday_bienvenida` | Hola {{1}}! Bienvenida a LegDay. Tu usuario es {{2}}. Entrá a {{3}} para ver tu rutina, tu dieta y tus horarios. |

5. Crear un **token permanente** (*Configuración del negocio → Usuarios del sistema → Generar token* con permiso `whatsapp_business_messaging`) y copiar el **Phone number ID**.
6. Meta cobra por cada mensaje de plantilla enviado; revisá la tarifa vigente para Argentina en la página de precios de WhatsApp Business.

> Mientras se aprueban las plantillas, poné `WHATSAPP_DRY_RUN=true`: la web funciona igual y los mensajes quedan en el historial sin enviarse.

### 4. Publicar la web (Vercel)
1. Subir esta carpeta a un repositorio de GitHub.
2. En **vercel.com** → *Add New → Project* → importar el repositorio.
3. En *Environment Variables* cargar todas las de `.env.example` con sus valores reales. `CRON_SECRET` es una clave larga inventada por vos.
4. *Deploy*. La tarea diaria de recordatorios queda programada sola por `vercel.json`.
5. El plan gratuito de Vercel es para uso personal; para un negocio corresponde el plan Pro.

### 5. Conectar el dominio
1. En Vercel → el proyecto → *Settings → Domains* → agregar `legday.com.ar` y `www.legday.com.ar`.
2. Vercel muestra qué registros DNS cargar. En nic.ar → *Delegaciones*, delegá el dominio a los servidores DNS de Vercel (`ns1.vercel-dns.com` y `ns2.vercel-dns.com`).
3. En unas horas el sitio abre en `https://legday.com.ar` con certificado seguro.
4. Actualizá `NEXT_PUBLIC_SITE_URL` y `STUDENT_EMAIL_DOMAIN` si usaste otro dominio.

## Animaciones de los ejercicios
Se suben desde *Panel → Ejercicios → Editar → Animación* y quedan guardadas en Supabase Storage (carpeta `ejercicios`).

| Recomendación | Valor |
|---|---|
| Formato | **MP4 (H.264)** es el más liviano y se ve en todos los celulares. También WebM, GIF o WebP. |
| Proporción | Cuadrada (1:1), por ejemplo 720 × 720 px |
| Duración | 3 a 6 segundos, una repetición completa que empalme en loop |
| Sonido | Sin audio (se reproduce en silencio y automático) |
| Peso | Ideal menos de 3 MB; máximo 50 MB |
| Fondo | Liso y claro, con la figura de perfil o tres cuartos para que se vea la técnica |

Para que la alumna pueda abrir la ficha desde su rutina, el nombre del ejercicio en la rutina tiene que coincidir con el de la biblioteca. El editor de rutinas sugiere los nombres mientras escribís, y si se renombra un ejercicio en la biblioteca, se actualiza solo en todas las rutinas.

## Uso diario
- **Alta de alumna:** *Alumnas → Nueva alumna*. Recibe por WhatsApp su usuario; la contraseña se la pasás vos.
- **Cambiar rutina o dieta:** elegí la alumna, editá y tocá *Guardar y avisar por WhatsApp*. Marcá otras alumnas para aplicarles el mismo cambio.
- **Cobro:** *Ganancias → Registrar pago*. El monto vacío toma la cuota de la alumna.
- **Ejercicio nuevo:** *Ejercicios → Nuevo ejercicio*, completar la técnica (un paso por línea) y subir la animación.
- **Pausar a una alumna:** destildá *Activa*. Se le cierra la sesión al instante, no puede volver a ingresar y no recibe recordatorios.
- **Contraseñas:** cada alumna y la entrenadora cambian la suya en *Mi cuenta* (piden la actual). Si una alumna la olvida, la entrenadora le pone una nueva desde *Alumnas → Editar*. Las contraseñas se guardan cifradas: nadie puede verlas, solo reemplazarlas.

## Trabajar en VS Code

### Ver el diseño al instante (sin configurar nada)
La carpeta `prototipo/` tiene la versión navegable con datos de ejemplo. No necesita base de datos ni internet.
1. Abrí la carpeta `legday` en VS Code (*Archivo → Abrir carpeta*).
2. Instalá la extensión recomendada **Live Preview** (VS Code la sugiere al abrir la carpeta).
3. Clic derecho en `prototipo/index.html` → *Show Preview*. También podés hacer doble clic en el archivo desde el explorador de tu computadora.
4. Ingresá con `entrenadora` / `legday2026` o con `sofia` / `legday123`.

El prototipo sirve para probar el diseño y los flujos. Los datos quedan solo en tu navegador.

### Levantar la web real en tu computadora
La web real lee todo de Supabase. **Sin el archivo `.env.local` con los datos de Supabase, la página da error 500** ("Your project's URL and Key are required").

Requisitos: **Node.js 20 LTS** (nodejs.org) y un proyecto gratuito de Supabase (paso 2 de la puesta en marcha). WhatsApp no hace falta para probar.

1. En la terminal de VS Code (*Terminal → Nueva terminal*), dentro de la carpeta `legday`:
   ```bash
   npm install
   ```
2. Copiá `.env.example` a `.env.local` y completá:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` con los de tu proyecto de Supabase.
   - `WHATSAPP_DRY_RUN=true`: no envía mensajes, solo los registra en *Avisos WhatsApp*.
   - `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
   - El resto puede quedar como está.
3. Iniciá la web:
   ```bash
   npm run dev
   ```
4. Abrí http://localhost:3000 e ingresá con el email y la contraseña de la entrenadora que creaste en Supabase.
5. Para ver el panel de una alumna, creá una desde *Alumnas → Nueva alumna* e ingresá con ese usuario en otra ventana de incógnito.

Cada vez que guardás un archivo, la página se actualiza sola. Los estilos están en `app/globals.css` y cada pantalla en `app/.../page.tsx`.

`.env.local` tiene claves secretas: no lo subas a GitHub (ya está excluido en `.gitignore`).

## Estructura
```
prototipo/index.html versión navegable con datos de ejemplo (para ver el diseño)
app/login            ingreso
app/admin/*          panel de la entrenadora + acciones del servidor (actions.ts)
app/mi-panel         panel de la alumna (incluye la biblioteca de ejercicios)
components/Exercise* biblioteca: ficha, buscador y carga de animaciones
app/api/pdf          descarga del PDF de la alumna
app/api/cron/...     recordatorios diarios
lib/whatsapp.ts      envío de plantillas, avisos y recordatorios
lib/dates.ts         días hábiles, vencimientos y formatos
lib/pdf.ts           armado del PDF
supabase/schema.sql  tablas y permisos (cada alumna ve solo lo suyo)
```
