// Wrapper temporal: la lógica real de roles/perfil vive en playerProfiles.js
// (V4, catálogo de 120+ apodos dinámicos). Se mantiene este módulo para no
// romper imports existentes (PlayerCard).
export { getPlayerProfile, selectRole, ROLE_CATEGORIES } from './playerProfiles';
