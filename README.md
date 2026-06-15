# Quiniela Mundial 26 · Oficina

Plataforma interna para la quiniela del Mundial FIFA 26 (Canadá · México · Estados Unidos).
Tema claro mundialista, resultados **en tiempo real** y lectura de quinielas con IA.

## Cómo correrla en local

```bash
npm install
npm run dev
```

## Acceso al panel (login)

El panel de administración **no aparece en el menú**: se entra escribiendo `#admin` al
final de la URL (en local `http://localhost:5173/#admin`; ya desplegada, `https://tu-sitio/#admin`).

Hay dos cuentas (contraseña `Mundial2026` en ambas):

| Usuario | Rol | Puede |
|---|---|---|
| `admin` | Super administrador | Todo: subir, editar, **borrar**, sincronizar, modo demo, **reiniciar** y la API key de OpenAI |
| `caty` | Administrador | Subir, editar, **borrar** quinielas y sincronizar. **No** puede reiniciar todo ni usar la API key |

**Cambiar usuarios o contraseñas:** edita el arreglo `USERS` en
[`src/services/auth.js`](src/services/auth.js) (texto plano, 10 segundos).

> ⚠️ **Importante:** como la app es 100 % navegador (sin servidor), el login es un
> "candado de oficina", no seguridad real: sirve para que nadie entre por accidente,
> no protege contra alguien técnico. No difundas la URL fuera del equipo.

## Resultados en tiempo real (sin API key)

Los marcadores, estados y minuto a minuto llegan del **feed público de ESPN** para la
Copa Mundial FIFA 2026. La app:

- Sincroniza al abrir y luego cada 90 s (cada 30 s si hay partidos en vivo).
- El chip de wifi en el encabezado muestra la hora de la última sincronización;
  haz clic para forzar una.
- Al detectar un gol real: toast, confeti, balones volando y mensaje en el chat.
  Si el gol es de México, el confeti sale en verde, blanco y rojo.
- Al terminar un partido: ráfaga discreta y marcador final en el chat. Si alguien
  clavó el marcador exacto, festejo dorado con su nombre (+3 pts).
- Si cambia el líder del pódium (con ventaja real, no por empates momentáneos): celebración grande.
- Los puntos se recalculan solos, incluso en vivo: +3 marcador exacto, +1 acierto de ganador/empate.

Clic en cualquier partido (pestaña **Partidos**) abre el **Match Center** estilo Google:
cronología de goles/tarjetas/cambios, posesión y estadísticas, actualizado cada 30 s en vivo.

## En el panel puedes

- **Subir quinielas** en Excel, PDF, XML o texto. El nombre y los pronósticos se detectan
  solos; si el nombre no viene claro, te lo pide antes de guardar.
- **API key de OpenAI** (solo super admin): se guarda solo en tu navegador y se usa como
  respaldo para PDFs o formatos que el lector local no entienda. Usa una key con límite de
  gasto bajo y bórrala al terminar de cargar.
- **Editar / borrar participantes**: lápiz para corregir nombre o pronósticos, bote para eliminar.
- **Sincronizar resultados** manualmente; **modo demo** y **reiniciar** (solo super admin).

## Desplegar gratis (recomendado: Netlify o Cloudflare Pages)

El proyecto está listo para hosting estático. Como usa routing por hash (`#admin`), **no
necesita reglas de rewrite**. El `*.xlsx` ya está en `.gitignore` para no subir datos de
los participantes.

Pasos (Netlify, ~5 min):

1. Sube el proyecto a un repositorio de GitHub (verifica con `git status` que **no** aparezcan
   los archivos `.xlsx` ni la carpeta `dist`).
2. En [netlify.com](https://netlify.com) → **Add new site** → **Import from Git** → elige el repo.
3. Build command `npm run build`, publish directory `dist` (ya viene en `netlify.toml`, se autorrellena).
4. **Deploy**. Tu URL queda como `https://tu-sitio.netlify.app`.
5. El admin entra escribiendo `/#admin` al final de esa URL, con `admin` / `Mundial2026`.

Vercel y Cloudflare Pages funcionan igual (preset *Vite*, salida `dist`). En **GitHub Pages**
bajo subruta `usuario.github.io/repo/` habría que configurar `base` en `vite.config.js`;
por eso es más fácil Netlify/Cloudflare. El plan gratis sobra para el mes del torneo.

## Notas

- Los datos (participantes, pronósticos, chat, sesión) viven en `localStorage` de cada
  navegador. Para que toda la oficina vea la misma tabla, proyecta/comparte la pantalla del
  organizador, o que cada quien consulte desde su equipo entendiendo que el chat y la sesión
  son locales.
- Las celebraciones (confeti) y la lectura de PDF usan CDNs (canvas-confetti, pdf.js). Si una
  CDN fallara, la app sigue funcionando: solo se pierde ese extra puntual.
- Los 72 partidos de fase de grupos están en `src/matches.json`; el feed los vincula por
  nombre de equipos (los alias ESPN↔app están en `src/services/liveData.js`).
