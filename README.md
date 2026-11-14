# LegDay · plataforma de seguimiento

Web para la entrenadora y sus alumnas: acceso con usuario y contraseña, calendario semanal, rutinas, dietas, biblioteca de ejercicios con animaciones, PDF descargable, ganancias y avisos automáticos por WhatsApp.

**Tecnología:** Next.js 14 (web) · Supabase (usuarios y base de datos) · WhatsApp Cloud API de Meta (mensajes) · Vercel (hosting y tarea diaria) · dominio propio.

## Qué hace

| Perfil | Funciones |
|---|---|
| Entrenadora (`/admin`) | Alta y edición de alumnas (usuario, contraseña, WhatsApp, cuota, vencimiento). Calendario semanal. Editor de rutinas y dietas, con opción de aplicar el mismo cambio a varias alumnas. Biblioteca de ejercicios: nombre, zona, músculos, equipo, nivel, técnica paso a paso, errores comunes y animación. Ganancias: pagos por mes, esperado vs. cobrado, gráfico de 6 meses, exportación a CSV. Historial de avisos. |
| Alumna (`/mi-panel`)   | Sus horarios, rutina, dieta y estado de cuota. Sector **Ejercicios** con buscador, filtro por zona y ficha de cada ejercicio con su animación; desde la rutina abre la ficha con “Ver técnica y animación”. Descarga de PDF: rutina, dieta o ambos. Marca “nuevo” cuando la entrenadora actualiza algo. |
| Automático             | Cada vez que se guarda una rutina, dieta u horario, la alumna recibe un WhatsApp. Todos los días a las 9:00 se envía el recordatorio a quien vence en 2 días hábiles (sin contar sábados, domingos ni feriados cargados). Al registrar un pago, el vencimiento se corre un mes y llega la confirmación. |

## Tests

```bash
npm test                # tests automáticos (fechas, WhatsApp, PDF y permisos del panel)
npm run security:check  # chequeo de seguridad del sitio publicado (solo lecturas)
```

`security:check` necesita tres variables: `SITE_URL` (tu dominio), `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
(la anon key es pública, la misma que usa el navegador). Revisa que las páginas privadas pidan sesión, que el cron
exija su clave, las cabeceras de seguridad, que un visitante anónimo no pueda leer la base y que el registro público
de cuentas en Supabase esté desactivado.
