// ============================================================
//  LOGIN DEL PANEL DE ADMINISTRACIÓN
// ============================================================
//
//  Para cambiar usuarios o contraseñas, edita SOLO el arreglo USERS de abajo.
//  Es texto plano a propósito: así lo cambias en 10 segundos.
//
//  Roles:
//   - 'superadmin' : control total (subir, editar, borrar, sincronizar,
//                    modo demo, reiniciar todo y la API key de OpenAI).
//   - 'admin'      : sube, edita, borra quinielas y sincroniza,
//                    pero NO puede reiniciar todo ni tocar la API key.
//
//  ⚠️  Importante: como la app es 100% navegador (sin servidor), este login
//      es un "candado de oficina", no seguridad real. Sirve para que nadie
//      entre por accidente al panel; no protege contra alguien técnico.
// ============================================================

const USERS = [
  { username: 'admin', password: 'Mundial2026', role: 'superadmin', displayName: 'Administrador' },
  { username: 'caty', password: 'Mundial2026', role: 'admin', displayName: 'Caty' }
];

const SESSION_KEY = 'quiniela_session';
// La sesión dura lo que dura el torneo (~30 días) y luego pide login otra vez.
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const VALID_ROLES = new Set(['superadmin', 'admin']);

export function login(username, password) {
  const cleanUser = String(username ?? '').trim().toLowerCase();
  const match = USERS.find(
    user => user.username.toLowerCase() === cleanUser && user.password === password
  );
  if (!match) return null;

  const session = {
    username: match.username,
    role: match.role,
    displayName: match.displayName,
    issuedAt: Date.now()
  };

  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // sin almacenamiento; la sesión vivirá solo en memoria del componente
  }
  return session;
}

export function getSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.role || !VALID_ROLES.has(session.role) || !session?.issuedAt) return null;
    if (Date.now() - session.issuedAt > SESSION_MAX_AGE_MS) {
      logout();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function logout() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // nada que hacer
  }
}
